import axios from 'axios'
import crypto from 'crypto'
import { findPlayerById } from '../store.js'

const DEFAULT_OPERATIONS_BASE = 'https://operations.dpbossking.com'

function getLauncherOrigin() {
  const raw = String(
    process.env.LAUNCHER_HOST ||
      process.env.OPERATIONS_API_BASE ||
      DEFAULT_OPERATIONS_BASE,
  )
    .trim()
    .replace(/\/+$/, '')

  if (/^https?:\/\//i.test(raw)) return raw
  return `https://${raw}`
}

function getOperationsConfig() {
  const partnerCode = String(process.env.PARTNER_CODE || '').trim()
  const privateApiKey = String(process.env.PRIVATE_API_KEY || '').trim()
  const baseUrl = String(
    process.env.OPERATIONS_API_BASE || DEFAULT_OPERATIONS_BASE,
  )
    .trim()
    .replace(/\/$/, '')

  if (!partnerCode || !privateApiKey) {
    const err = new Error(
      'PARTNER_CODE and PRIVATE_API_KEY must be configured in backend environment',
    )
    err.status = 500
    throw err
  }

  const cleanPartnerCode = partnerCode.replace(/^\/+/, '')
  const endpoint = `${baseUrl}/${cleanPartnerCode}`
  const host = new URL(endpoint).host
  const launcherOrigin = getLauncherOrigin()

  return { partnerCode: cleanPartnerCode, privateApiKey, endpoint, host, launcherOrigin }
}

async function postOperations(body) {
  const { privateApiKey, endpoint, host } = getOperationsConfig()
  const response = await axios.post(endpoint, body, {
    timeout: 12000,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Api-Key': privateApiKey,
      Host: host,
    },
  })
  return response.data || {}
}

function normalizeGame(raw, index) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id ?? raw._id ?? raw.code ?? index)
  const code = String(raw.code || raw.id || '').trim()
  const name = String(raw.name || raw.title || code || 'Game').trim()
  const slug = String(raw.slug || code || id)
    .trim()
    .toLowerCase()

  return {
    id,
    name,
    code,
    slug,
    provider: String(raw.provider || '').trim(),
    device: Array.isArray(raw.device) ? raw.device : [],
    currencies: Array.isArray(raw.currencies) ? raw.currencies : [],
    thumbnail: String(raw.media || raw.image || raw.thumbnail || raw.icon || '').trim(),
    launchUrl: String(raw.launchUrl || raw.url || '').trim(),
    demoUrl: String(raw.demoUrl || '').trim(),
    maintenanceMode: Boolean(raw.maintenanceMode),
  }
}

export async function requestGameSessionToken({
  userId = '',
  username,
  currency = 'INR',
  token = '',
  closeUrl = '',
  callbackUrl = '',
  lang = 'en',
}) {
  const cleanUserId = String(userId || '').trim()
  const cleanUsername = String(username || '').trim()
  if (!cleanUsername) {
    const err = new Error('username is required to generate game session token')
    err.status = 400
    throw err
  }

  const { privateApiKey } = getOperationsConfig()
  const md5 = crypto
    .createHash('md5')
    .update(`${cleanUserId || cleanUsername}${privateApiKey}`)
    .digest('hex')

  const body = {
    opType: 1050,
    username: cleanUsername,
    md5,
    currency: String(currency || 'INR').trim().toUpperCase(),
    lang: String(lang || 'en').trim().toLowerCase(),
  }

  if (cleanUserId) body.user_id = cleanUserId
  if (token) body.token = String(token).trim()
  if (closeUrl) body.close_url = String(closeUrl).trim()
  if (callbackUrl) body.callback_url = String(callbackUrl).trim()

  const payload = await postOperations(body)
  if (payload.status === false) {
    const err = new Error(
      typeof payload.message === 'string'
        ? payload.message
        : 'Upstream create-token API returned status=false',
    )
    err.status = 502
    throw err
  }

  const sessionToken =
    typeof payload.message === 'string'
      ? payload.message.trim()
      : String(payload.message?.token || payload.token || '').trim()

  if (!sessionToken) {
    const err = new Error('Upstream create-token API returned an empty token')
    err.status = 502
    throw err
  }

  return sessionToken
}

export async function listGames(_req, res) {
  try {
    const payload = await postOperations({ opType: 1071 })
    if (payload.status === false) {
      const errMsg =
        typeof payload.message === 'string'
          ? payload.message
          : 'Upstream games API returned status=false'
      return res.status(502).json({
        success: false,
        message: errMsg,
      })
    }

    const list = Array.isArray(payload.message)
      ? payload.message
      : Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : []

    const games = list.map(normalizeGame).filter(Boolean)

    return res.json({
      success: true,
      count: games.length,
      data: games,
    })
  } catch (err) {
    const status = err.status || err.response?.status || 502
    const detail =
      (typeof err.response?.data?.message === 'string' && err.response.data.message) ||
      err.message ||
      'Failed to fetch games'
    console.error('[GAMES] Fetch failed:', detail)
    return res.status(status >= 400 && status < 600 ? status : 502).json({
      success: false,
      message: detail,
    })
  }
}

/** POST /api/games/token — create player session token via opType 1050 */
export async function createGameToken(req, res) {
  try {
    const player = await findPlayerById(req.playerId)
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' })
    }
    if (player.isSuspended) {
      return res.status(403).json({ success: false, message: 'Account is suspended' })
    }

    const userId = String(player._id || player.id)
    const username = String(player.username || player.phone || userId).trim()
    const currency = String(req.body?.currency || 'INR').trim().toUpperCase()
    const lang = String(req.body?.lang || 'en').trim().toLowerCase()
    const closeUrl = String(
      req.body?.close_url || req.body?.closeUrl || process.env.FRONTEND_URL || '',
    ).trim()
    const callbackUrl = String(
      req.body?.callback_url ||
        req.body?.callbackUrl ||
        process.env.WALLET_CALLBACK_URL ||
        '',
    ).trim()
    const customToken = String(req.body?.token || '').trim()

    const sessionToken = await requestGameSessionToken({
      userId,
      username,
      currency,
      lang,
      closeUrl,
      callbackUrl,
      token: customToken,
    })

    return res.json({
      success: true,
      data: {
        token: sessionToken,
        userId,
        username,
        currency,
      },
    })
  } catch (err) {
    const status = err.status || err.response?.status || 502
    const detail =
      (typeof err.response?.data?.message === 'string' && err.response.data.message) ||
      err.message ||
      'Failed to generate game session token'
    console.error('[GAMES] Create token failed:', detail)
    return res.status(status >= 400 && status < 600 ? status : 502).json({
      success: false,
      message: detail,
    })
  }
}

/** POST /api/games/launch — create token via opType 1050 and return launch URL */
export async function launchGame(req, res) {
  try {
    const gid = String(
      req.body?.gid || req.body?.gameId || req.body?.code || req.params?.gid || '',
    ).trim()
    if (!gid) {
      return res.status(400).json({ success: false, message: 'gid is required' })
    }

    const player = await findPlayerById(req.playerId)
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' })
    }
    if (player.isSuspended) {
      return res.status(403).json({ success: false, message: 'Account is suspended' })
    }

    const userId = String(player._id || player.id)
    const username = String(player.username || player.phone || userId).trim()
    const currency = String(req.body?.currency || 'INR').trim().toUpperCase()
    const lang = String(req.body?.lang || 'en').trim().toLowerCase()
    const closeUrl = String(
      req.body?.close_url || req.body?.closeUrl || process.env.FRONTEND_URL || '',
    ).trim()
    const callbackUrl = String(
      req.body?.callback_url ||
        req.body?.callbackUrl ||
        process.env.WALLET_CALLBACK_URL ||
        '',
    ).trim()

    const sessionToken = await requestGameSessionToken({
      userId,
      username,
      currency,
      lang,
      closeUrl,
      callbackUrl,
    })

    const { partnerCode, launcherOrigin } = getOperationsConfig()
    const launchUrlObj = new URL(
      `${launcherOrigin}/${encodeURIComponent(partnerCode)}/launch/${encodeURIComponent(gid)}/${encodeURIComponent(sessionToken)}`,
    )
    const extsess = String(req.body?.extsess || '').trim()
    if (extsess) launchUrlObj.searchParams.set('extsess', extsess)
    if (lang) launchUrlObj.searchParams.set('lang', lang)
    const launchUrl = launchUrlObj.toString()

    return res.json({
      success: true,
      data: {
        gid,
        token: sessionToken,
        launchUrl,
      },
    })
  } catch (err) {
    const status = err.status || err.response?.status || 502
    const detail =
      (typeof err.response?.data?.message === 'string' && err.response.data.message) ||
      err.message ||
      'Failed to launch game'
    console.error('[GAMES] Launch failed:', detail)
    return res.status(status >= 400 && status < 600 ? status : 502).json({
      success: false,
      message: detail,
    })
  }
}
