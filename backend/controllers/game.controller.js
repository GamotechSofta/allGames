import mongoose from 'mongoose'
import { Game } from '../models/game.model.js'
import { GameSession } from '../models/gameSession.model.js'
import { GapWalletTransaction } from '../models/gapWalletTransaction.model.js'
import { findPlayerById, getWallet } from '../store.js'
import { gapRequest } from '../services/gap.service.js'
import { buildLaunchUrl } from '../launch.js'
import { isDirectLaunchGame } from '../seedDirectGames.js'
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
    let gapResponse = null
    let launchUrl = ''
    let sessionId = ''

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
        playerName: user.username || user.phone || playerId,
        currency: user.currency || 'INR',
        language: 'en',
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

    auditLaunch(req, 'SUCCESS', {
      responseSummary: { message: 'Game launch successful', sessionId: String(sessionId || '') },
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
    auditLaunch(req, 'FAILED', { responseSummary: { message: 'Failed to launch game' } })
    return res.status(500).json({
      success: false,
      message: 'Failed to launch game',
    })
  }
}

/** GET /api/game/history — credit/debit wallet history for the authenticated player */
export async function playerGameHistory(req, res) {
  try {
    const playerId = String(req.playerId || '')
    if (!isValidObjectId(playerId)) {
      return res.status(400).json({ success: false, message: 'Invalid player' })
    }

    const oid = new mongoose.Types.ObjectId(playerId)
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)

    const [transactions, catalog] = await Promise.all([
      GapWalletTransaction.find({
        userId: oid,
        type: { $in: ['DEBIT', 'CREDIT', 'debit', 'credit'] },
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Game.find({}).select('gameId title name provider').lean(),
    ])

    const titleById = Object.fromEntries(
      catalog.map((g) => [g.gameId, g.title || g.name || g.gameId]),
    )

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

    return res.json({
      success: true,
      data: {
        feed: txRows,
        transactions: txRows,
      },
    })
  } catch (error) {
    console.error('[GAME] history error', error)
    return res.status(500).json({ success: false, message: 'Failed to load history' })
  }
}

