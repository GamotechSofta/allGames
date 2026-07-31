import mongoose from 'mongoose'
import { Game } from '../models/game.model.js'
import { GameSession } from '../models/gameSession.model.js'
import { findPlayerById, getWallet } from '../store.js'
import { gapRequest } from '../services/gap.service.js'
import { buildLaunchUrl } from '../launch.js'
import { isDirectLaunchGame } from '../seedDirectGames.js'

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ''))

function playerIdOf(player) {
  return String(player._id || player.id)
}

/** POST /api/admin/game/add */
export async function addGame(req, res) {
  try {
    const { name, gameId, provider, status, image, title } = req.body || {}
    if (!name || !gameId || !provider) {
      return res.status(400).json({
        success: false,
        message: 'name, gameId and provider are required',
      })
    }

    const existing = await Game.findOne({ gameId: String(gameId).trim() }).lean()
    if (existing) {
      return res.status(409).json({ success: false, message: 'gameId already exists' })
    }

    const game = await Game.create({
      name: String(name).trim(),
      title: String(title || name).trim(),
      gameId: String(gameId).trim(),
      provider: String(provider).trim(),
      image: image ? String(image).trim() : '',
      status: status === 'inactive' ? 'inactive' : 'active',
      isActive: status !== 'inactive',
    })

    return res.status(201).json({ success: true, data: game })
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

/** GET /api/game/list */
export async function listActiveGames(req, res) {
  try {
    const fieldsPreset = String(req.query.fields || '').toLowerCase()
    const parsedLimit = Number.parseInt(String(req.query.limit || ''), 10)
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : null

    let query = Game.find({ status: 'active' }).sort({ createdAt: -1 })
    if (fieldsPreset === 'home') {
      query = query.select('name gameId provider title image status createdAt')
    } else {
      query = query.select('name gameId provider title image status createdAt')
    }
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
 * Body: { userId, gameId }
 */
export async function launchGame(req, res) {
  try {
    const { userId, gameId } = req.body || {}

    if (!userId || !gameId) {
      return res.status(400).json({
        success: false,
        message: 'userId and gameId are required',
      })
    }
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId' })
    }

    // Prefer authenticated player; body userId must match token when present
    if (req.playerId && String(req.playerId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'userId does not match authenticated player',
      })
    }

    const user = await findPlayerById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const wallet = await getWallet(playerIdOf(user))
    const game = await Game.findOne({ gameId: String(gameId).trim() }).lean()
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' })
    }

    const active = game.status ? game.status === 'active' : !!game.isActive
    if (!active) {
      return res.status(403).json({ success: false, message: 'Game is inactive' })
    }

    const catalogGameId = String(gameId).trim()
    const playerId = playerIdOf(user)
    const balance = Number(wallet.balance || 0)
    let gapResponse = null
    let launchUrl = ''
    let sessionId = ''

    // Ludo / Teen Patti: direct launch URLs from env (not GAP)
    if (isDirectLaunchGame(catalogGameId, game.provider)) {
      const token = req.token
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Authentication token required for direct game launch',
        })
      }
      launchUrl = buildLaunchUrl(catalogGameId, {
        playerId,
        token,
        balance,
        username: user.username,
        phone: user.phone,
        returnUrl: req.body?.returnUrl || process.env.FRONTEND_URL || '',
      })
      sessionId = `direct_${catalogGameId}_${Date.now()}`
    } else {
      const payload = {
        operatorId: process.env.OPERATOR_ID,
        userId: playerId,
        balance,
        gameId: catalogGameId,
      }

      try {
        gapResponse = await gapRequest('/launch-game', payload)
        launchUrl = gapResponse?.launchUrl || gapResponse?.data?.launchUrl || ''
        sessionId = gapResponse?.sessionId || gapResponse?.data?.sessionId || ''
      } catch (providerErr) {
        console.warn('[GAME] GAP launch failed, using mock launch URL:', providerErr.message)
      }

      if (!launchUrl) {
        sessionId =
          sessionId || `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        const base = process.env.GAP_BASE_URL || 'https://provider-game-url.com'
        launchUrl = `${base.replace(/\/$/, '')}/session/${sessionId}?gameId=${encodeURIComponent(catalogGameId)}&userId=${encodeURIComponent(playerId)}`
      }
    }

    await GameSession.create({
      userId: user._id,
      gameId: catalogGameId,
      sessionId: String(sessionId),
      launchUrl: String(launchUrl),
      provider: game.provider || 'GAP',
      rawResponse: gapResponse,
    })

    return res.json({
      success: true,
      launchUrl,
      sessionId,
      provider: game.provider || 'GAP',
      message: 'Game launch successful',
    })
  } catch (error) {
    console.error('[GAME] launch error', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to launch game',
    })
  }
}
