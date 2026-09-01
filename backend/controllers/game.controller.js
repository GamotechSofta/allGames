import mongoose from 'mongoose'
import { Game } from '../models/game.model.js'
import { GameSession } from '../models/gameSession.model.js'
import { GapWalletTransaction } from '../models/gapWalletTransaction.model.js'
import { findPlayerById, getWallet } from '../store.js'
import { auditLog } from '../utils/logger.js'

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ''))

function playerIdOf(player) {
  return String(player._id || player.id)
}

function auditLaunch(req, status, meta = {}) {
  auditLog('[GAME_LAUNCH_AUDIT]', {
    route: '/api/game/launch',
    method: req.method,
    timestamp: new Date().toISOString(),
    userId: req.body?.userId || req.playerId || null,
    gameId: req.body?.gameId || null,
    status,
    request: { userId: req.body?.userId, gameId: req.body?.gameId },
    responseSummary: meta.responseSummary || null,
  })
}

function normalizeLaunchUrl(value) {
  const url = String(value || '').trim()
  if (!url) return ''
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('invalid protocol')
    }
    return url
  } catch {
    return null
  }
}

function joinLaunchBase(base, params) {
  const url = new URL(base)
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

function isPrivateReturnUrl(value) {
  try {
    const host = new URL(String(value || '')).hostname.toLowerCase()
    if (!host || host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return true
    if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true
    if (/^192\.168\.\d+\.\d+$/.test(host)) return true
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)) return true
    return false
  } catch {
    return true
  }
}

/** Prefer client returnUrl; never fall back to a private FRONTEND_URL (Chrome PNA). */
function resolveReturnUrl(raw) {
  const fromBody = String(raw || '').trim()
  if (fromBody && !isPrivateReturnUrl(fromBody)) return fromBody
  const fromEnv = String(process.env.FRONTEND_URL || '').trim()
  if (fromEnv && !isPrivateReturnUrl(fromEnv)) return fromEnv
  return ''
}


/** Hosts / providers that refuse iframe embedding (must open top-level). */
function resolveOpenMode(_launchUrl, _provider) {
  // Always embed in the player /play iframe (same tab)
  return 'iframe'
}


/** POST /api/admin/game/add */
export async function addGame(req, res) {
  try {
    const { name, gameId, provider, status, image, title, launchUrl } = req.body || {}
    if (!name || !gameId || !provider) {
      return res.status(400).json({
        success: false,
        message: 'name, gameId and provider are required',
      })
    }

    const normalizedLaunch = normalizeLaunchUrl(launchUrl)
    if (!normalizedLaunch) {
      return res.status(400).json({
        success: false,
        message: 'launchUrl is required (valid http(s) URL from admin panel)',
      })
    }

    const catalogGameId = String(gameId).trim()
    const payload = {
      name: String(name).trim(),
      title: String(title || name).trim(),
      gameId: catalogGameId,
      provider: String(provider).trim(),
      image: image ? String(image).trim() : '',
      launchUrl: normalizedLaunch || '',
      status: status === 'inactive' ? 'inactive' : 'active',
      isActive: status !== 'inactive',
    }

    const existing = await Game.findOne({ gameId: catalogGameId })
    if (existing) {
      existing.name = payload.name
      existing.title = payload.title
      existing.provider = payload.provider
      existing.image = payload.image || existing.image
      existing.launchUrl = payload.launchUrl
      existing.status = payload.status
      existing.isActive = payload.isActive
      await existing.save()
      return res.json({
        success: true,
        data: existing,
        message: 'Game updated (gameId already existed)',
      })
    }

    const game = await Game.create(payload)
    return res.status(201).json({ success: true, data: game, message: 'Game added' })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to add game',
    })
  }
}

/** GET /api/admin/game/list */
export async function listGames(_req, res) {
  try {
    const games = await Game.find({}).sort({ createdAt: -1 }).lean()
    return res.json({ success: true, data: games })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to list games',
    })
  }
}

/** PUT /api/admin/game/toggle */
export async function toggleGame(req, res) {
  try {
    const { id, gameId, status } = req.body || {}
    if (!id && !gameId) {
      return res.status(400).json({ success: false, message: 'id or gameId is required' })
    }

    const query = id ? { _id: id } : { gameId: String(gameId).trim() }
    const game = await Game.findOne(query)
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' })
    }

    if (status === 'active' || status === 'inactive') {
      game.status = status
      game.isActive = status === 'active'
    } else {
      game.status = game.status === 'active' ? 'inactive' : 'active'
      game.isActive = game.status === 'active'
    }

    await game.save()
    return res.json({ success: true, data: game })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to toggle game status',
    })
  }
}

/** PUT /api/admin/game/launch-url — update catalog launch base URL */
export async function updateGameLaunchUrl(req, res) {
  try {
    const { id, gameId, launchUrl } = req.body || {}
    if (!id && !gameId) {
      return res.status(400).json({ success: false, message: 'id or gameId is required' })
    }

    const normalizedLaunch = normalizeLaunchUrl(launchUrl)
    if (launchUrl != null && String(launchUrl).trim() !== '' && normalizedLaunch === null) {
      return res.status(400).json({
        success: false,
        message: 'launchUrl must be a valid http(s) URL',
      })
    }

    const query = id ? { _id: id } : { gameId: String(gameId).trim() }
    const game = await Game.findOne(query)
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' })
    }

    game.launchUrl = normalizedLaunch || ''
    await game.save()
    return res.json({ success: true, data: game })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update launch URL',
    })
  }
}

/** DELETE /api/admin/game/delete */
export async function deleteGame(req, res) {
  try {
    const { id, gameId } = req.body || {}
    if (!id && !gameId) {
      return res.status(400).json({ success: false, message: 'id or gameId is required' })
    }

    const query = id ? { _id: id } : { gameId: String(gameId).trim() }
    const game = await Game.findOneAndDelete(query)
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' })
    }

    return res.json({ success: true, data: game, message: 'Game deleted' })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete game',
    })
  }
}

/** GET /api/game/list */
export async function listActiveGames(req, res) {
  try {
    const fieldsPreset = String(req.query.fields || '').toLowerCase()
    const parsedLimit = Number.parseInt(String(req.query.limit || ''), 10)
    let limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : null
    if (limit == null && fieldsPreset === 'home') limit = 12

    let query = Game.find({ status: 'active' }).sort({ createdAt: -1 })
    query = query.select('_id name gameId provider title image status createdAt')
    if (limit) query = query.limit(limit)

    const games = await query.lean()
    return res.json({ success: true, data: games })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to list active games',
    })
  }
}

/**
 * POST /api/game/launch
 * Body: { userId?, gameId } — userId preferably derived from JWT
 */
export async function launchGame(req, res) {
  try {
    auditLaunch(req, 'REQUESTED')

    const gameIdRaw = req.body?.gameId || req.body?.gameCode
    // Prefer JWT-derived userId; in production never trust body.userId alone
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production'
    let userId = req.playerId || req.body?.userId
    if (isProd) {
      if (!req.playerId) {
        auditLaunch(req, 'FAILED', { responseSummary: { message: 'Authentication required' } })
        return res.status(401).json({ success: false, message: 'Authentication required' })
      }
      userId = req.playerId
    } else if (req.playerId && req.body?.userId && String(req.playerId) !== String(req.body.userId)) {
      auditLaunch(req, 'FAILED', { responseSummary: { message: 'userId mismatch' } })
      return res.status(403).json({
        success: false,
        message: 'userId does not match authenticated player',
      })
    }

    if (!userId || !gameIdRaw) {
      auditLaunch(req, 'FAILED', { responseSummary: { message: 'userId and gameId are required' } })
      return res.status(400).json({
        success: false,
        message: 'userId and gameId are required',
      })
    }
    if (!isValidObjectId(userId)) {
      auditLaunch(req, 'FAILED', { responseSummary: { message: 'Invalid userId' } })
      return res.status(400).json({ success: false, message: 'Invalid userId' })
    }

    const user = await findPlayerById(userId)
    if (!user) {
      auditLaunch(req, 'FAILED', { responseSummary: { message: 'User not found' } })
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const wallet = await getWallet(playerIdOf(user))
    const catalogGameId = String(gameIdRaw).trim()
    const game = await Game.findOne({ gameId: catalogGameId }).lean()
    if (!game) {
      auditLaunch(req, 'FAILED', { responseSummary: { message: 'Game not found' } })
      return res.status(404).json({ success: false, message: 'Game not found' })
    }

    const active = game.status ? game.status === 'active' : !!game.isActive
    if (!active) {
      auditLaunch(req, 'FAILED', { responseSummary: { message: 'Game is inactive' } })
      return res.status(403).json({ success: false, message: 'Game is inactive' })
    }

    const playerId = playerIdOf(user)
    const balance = Number(wallet.balance || 0)
    const catalogLaunchBase = String(game.launchUrl || '').trim()
    const returnUrl = resolveReturnUrl(req.body?.returnUrl)

    if (!catalogLaunchBase) {
      auditLaunch(req, 'FAILED', {
        responseSummary: { message: 'Launch URL not configured' },
      })
      return res.status(400).json({
        success: false,
        message:
          'This game has no Launch URL. Open Admin → Games, set Launch URL, and Save URL.',
      })
    }

    const token = req.token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required for game launch',
      })
    }

    const sessionId = `direct_${catalogGameId}_${Date.now()}`
    const operatorId = process.env.APP_OPERATOR_ID || '1'
    const operatorBaseUrl = String(process.env.OPERATOR_PUBLIC_BASE_URL || '')
      .trim()
      .replace(/\/$/, '')
    const bal = String(balance ?? 0)
    // Admin Launch URL + platform params.
    // Include PotLudo/operator aliases (id, game_id) so fashionbuddies can start a session.
    const launchUrl = joinLaunchBase(catalogLaunchBase, {
      userId: playerId,
      gameId: catalogGameId,
      game_id: catalogGameId,
      sessionId,
      token,
      id: token,
      returnUrl,
      balance: bal,
      available_balance: bal,
      wallet: bal,
      real_wallet: bal,
      username: user.username || user.phone || playerId,
      operatorId,
      operator_id: operatorId,
      // So games that honor a runtime operator URL can reach this backend
      ...(operatorBaseUrl
        ? {
            operatorBaseUrl,
            operator_base_url: operatorBaseUrl,
            APP_OPERATOR_BASE_URL: operatorBaseUrl,
            apiUrl: operatorBaseUrl,
            baseUrl: operatorBaseUrl,
          }
        : {}),
    })

    await GameSession.create({
      userId: user._id,
      gameId: catalogGameId,
      sessionId: String(sessionId),
      launchUrl: String(launchUrl),
      provider: game.provider || '',
      rawResponse: null,
    })

    auditLaunch(req, 'SUCCESS', {
      responseSummary: { message: 'Game launch successful', sessionId: String(sessionId || '') },
    })

    return res.json({
      success: true,
      launchUrl,
      sessionId,
      provider: game.provider || '',
      openMode: resolveOpenMode(launchUrl, game.provider),
      message: 'Game launch successful',
    })
  } catch (error) {
    console.error('[GAME] launch error', error)
    auditLaunch(req, 'FAILED', { responseSummary: { message: 'Failed to launch game' } })
    return res.status(500).json({
      success: false,
      message: 'Failed to launch game',
    })
  }
}

/** Build merged game history: launches + wallet credit/debit rows */
export async function buildPlayerGameHistory(userId, limit = 50) {
  const oid = new mongoose.Types.ObjectId(String(userId))
  const cap = Math.min(Math.max(Number(limit) || 50, 1), 100)

  const [sessions, transactions, catalog] = await Promise.all([
    GameSession.find({ userId: oid }).sort({ createdAt: -1 }).limit(cap).lean(),
    GapWalletTransaction.find({
      userId: oid,
      type: { $in: ['DEBIT', 'CREDIT', 'debit', 'credit'] },
    })
      .sort({ createdAt: -1 })
      .limit(cap)
      .lean(),
    Game.find({}).select('gameId title name provider').lean(),
  ])

  const titleById = Object.fromEntries(
    catalog.map((g) => [g.gameId, g.title || g.name || g.gameId]),
  )

  const sessionRows = sessions.map((s) => ({
    id: String(s._id),
    kind: 'LAUNCH',
    type: 'LAUNCH',
    gameId: s.gameId || '',
    gameTitle: s.gameId ? titleById[s.gameId] || s.gameId : 'Game',
    sessionId: s.sessionId || '',
    provider: s.provider || '',
    createdAt: s.createdAt,
  }))

  const txRows = transactions.map((t) => {
    const type = String(t.type || '').toUpperCase()
    return {
      id: String(t._id),
      kind: type === 'CREDIT' ? 'CREDIT' : type === 'DEBIT' ? 'DEBIT' : type || 'TX',
      type,
      amount: Number(t.amount) || 0,
      balanceAfter: Number(t.balanceAfter) || 0,
      status: t.status || 'SUCCESS',
      gameId: t.gameId || '',
      gameTitle: t.gameId ? titleById[t.gameId] || t.gameId : 'Wallet',
      roundId: t.roundId || '',
      transactionId: t.transactionId,
      rolledBack: Boolean(t.rolledBack),
      createdAt: t.createdAt,
    }
  })

  const feed = [...sessionRows, ...txRows]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, cap)

  return {
    feed,
    sessions: sessionRows,
    transactions: txRows,
  }
}

/** GET /api/game/history — game launches + credit/debit history for authenticated player */
export async function playerGameHistory(req, res) {
  try {
    const playerId = String(req.playerId || '')
    if (!isValidObjectId(playerId)) {
      return res.status(400).json({ success: false, message: 'Invalid player' })
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)
    const data = await buildPlayerGameHistory(playerId, limit)

    return res.json({
      success: true,
      data: {
        feed: data.feed,
        transactions: data.transactions,
        sessions: data.sessions,
      },
    })
  } catch (error) {
    console.error('[GAME] history error', error)
    return res.status(500).json({ success: false, message: 'Failed to load history' })
  }
}

/** GET /api/admin/player/history?playerId= — game history for any player (admin) */
export async function adminPlayerGameHistory(req, res) {
  try {
    const playerId = String(req.query?.playerId || req.query?.userId || '').trim()
    if (!isValidObjectId(playerId)) {
      return res.status(400).json({ success: false, message: 'Valid playerId is required' })
    }

    const player = await findPlayerById(playerId)
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' })
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)
    const data = await buildPlayerGameHistory(playerId, limit)

    return res.json({
      success: true,
      data: {
        player: {
          id: playerIdOf(player),
          username: player.username,
          phone: player.phone,
        },
        feed: data.feed,
        transactions: data.transactions,
        sessions: data.sessions,
      },
    })
  } catch (error) {
    console.error('[ADMIN] player history error', error)
    return res.status(500).json({ success: false, message: 'Failed to load player history' })
  }
}

