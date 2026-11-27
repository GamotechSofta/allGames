import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { findPlayerById, getWallet, Player } from '../store.js'

function isValidApiKey(providedKey, expectedKey) {
  if (!providedKey || !expectedKey) return false
  const a = Buffer.from(String(providedKey).trim(), 'utf8')
  const b = Buffer.from(String(expectedKey).trim(), 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

async function resolvePlayer({ userId, extsess }) {
  const rawId = String(userId || '').trim()
  if (rawId) {
    const byId = await findPlayerById(rawId)
    if (byId) return byId

    const byLookup = await Player.findOne({
      $or: [{ username: rawId }, { phone: rawId }],
    }).lean()
    if (byLookup) return byLookup
  }

  const rawExtsess = String(extsess || '').trim()
  if (rawExtsess) {
    try {
      const decoded = jwt.verify(
        rawExtsess,
        process.env.JWT_SECRET || 'allgames-dev-secret',
      )
      if (decoded?.playerId) {
        const byJwt = await findPlayerById(String(decoded.playerId))
        if (byJwt) return byJwt
      }
    } catch {
      /* ignore non-JWT extsess */
    }
  }

  return null
}

/** opType 2051 — Seamless Balance lookup */
async function handleBalance(req, res) {
  const userId = req.body?.user_id
  const extsess = req.body?.extsess

  const player = await resolvePlayer({ userId, extsess })
  if (!player) {
    return res.status(404).json({
      status: false,
      message: 'Player not found',
    })
  }

  if (player.isSuspended) {
    return res.status(403).json({
      status: false,
      message: 'Player account is suspended',
    })
  }

  const playerId = String(player._id || player.id)
  const wallet = await getWallet(playerId)
  const balance = Number(wallet?.balance ?? 0)

  return res.json({
    status: true,
    message: Number.isFinite(balance) ? balance : 0,
  })
}

/** POST /api/seamless (and /api/seamless/callback) */
export async function handleSeamlessCallback(req, res) {
  try {
    const expectedKey = String(process.env.PRIVATE_API_KEY || '').trim()
    if (!expectedKey) {
      return res.status(500).json({
        status: false,
        message: 'PRIVATE_API_KEY is not configured',
      })
    }

    const providedKey =
      req.get('Api-Key') || req.get('api-key') || req.headers['api-key'] || ''
    if (!isValidApiKey(providedKey, expectedKey)) {
      return res.status(401).json({
        status: false,
        message: 'Invalid Api-Key',
      })
    }

    const opType = Number(req.body?.opType)
    console.log('[SEAMLESS]', {
      opType,
      user_id: req.body?.user_id || '',
      hasToken: Boolean(req.body?.token),
    })

    switch (opType) {
      case 2051:
        return await handleBalance(req, res)
      default:
        return res.status(400).json({
          status: false,
          message: `Unsupported opType: ${req.body?.opType ?? 'missing'}`,
        })
    }
  } catch (err) {
    console.error('[SEAMLESS] Error:', err)
    return res.status(500).json({
      status: false,
      message: err.message || 'Internal server error',
    })
  }
}
