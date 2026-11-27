import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { adjustWallet, findPlayerById, getWallet, Player } from '../store.js'
import { GapWalletTransaction } from '../models/gapWalletTransaction.model.js'

function roundMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

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
  const balance = roundMoney(wallet?.balance ?? 0)

  return res.json({
    status: true,
    message: balance,
  })
}

/** opType 2052 — Seamless Credit Transfer (bet / win / refund) */
async function handleCreditTransfer(req, res) {
  const body = req.body || {}
  const player = await resolvePlayer({
    userId: body.user_id,
    extsess: body.extsess,
  })

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
  const oid = new mongoose.Types.ObjectId(playerId)

  const rawBet = body.bet ?? 0
  const rawWin = body.win ?? 0
  const bet = roundMoney(rawBet)
  const win = roundMoney(rawWin)

  if (!Number.isFinite(Number(rawBet)) || bet < 0 || !Number.isFinite(Number(rawWin)) || win < 0) {
    return res.status(400).json({
      status: false,
      message: 'Invalid bet or win amount',
    })
  }

  const ttype = Number(body.ttype ?? 1)
  const gameType = String(body.game_type || body.gameType || '').trim().toLowerCase()
  const isRefund = ttype === 2 || gameType === 'refund'

  // Accept string or numeric gid (e.g. "LUDO" or 2)
  const gameId = String(body.gid ?? body.game_id ?? body.gameId ?? '').trim()
  const roundId = String(body.round_id ?? body.roundId ?? '').trim()
  const tranId = String(
    body.tranid ??
      body.tran_id ??
      body.transaction_id ??
      body.transactionId ??
      body.txId ??
      '',
  ).trim()

  const txKey =
    tranId || `seamless-${playerId}-${gameId || 'game'}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`

  // Fast-path idempotency check
  if (tranId) {
    const existing = await GapWalletTransaction.findOne({ transactionId: tranId }).lean()
    if (existing) {
      const wallet = await getWallet(playerId)
      return res.json({
        status: true,
        message: roundMoney(wallet?.balance ?? existing.balanceAfter ?? 0),
      })
    }
  }

  let session
  try {
    session = await mongoose.startSession()
    let finalBalance = 0

    await session.withTransaction(async () => {
      if (tranId) {
        const existingInTx = await GapWalletTransaction.findOne({
          transactionId: tranId,
        }).session(session)
        if (existingInTx) {
          const wallet = await getWallet(playerId, session)
          finalBalance = roundMoney(wallet?.balance ?? existingInTx.balanceAfter ?? 0)
          return
        }
      }

      const currentWallet = await getWallet(playerId, session)
      const currentBalance = roundMoney(currentWallet.balance)

      if (isRefund) {
        const refundAmount = win > 0 ? win : bet
        const updated =
          refundAmount > 0
            ? await adjustWallet(playerId, refundAmount, session)
            : currentWallet
        finalBalance = roundMoney(updated.balance)

        await GapWalletTransaction.create(
          [
            {
              transactionId: txKey,
              userId: oid,
              type: 'CREDIT',
              amount: refundAmount,
              status: 'SUCCESS',
              balanceAfter: finalBalance,
              gameId,
              roundId,
              provider: 'SEAMLESS',
              remarks: `Refund (${gameType || 'ttype=2'})`,
              rawPayload: body,
            },
          ],
          { session },
        )
        return
      }

      // Standard bet/win settlement (ttype = 1)
      if (bet > 0 && currentBalance < bet) {
        const err = new Error('Insufficient balance')
        err.code = 'INSUFFICIENT_BALANCE'
        err.status = 400
        throw err
      }

      const delta = roundMoney(win - bet)
      const updated =
        delta !== 0
          ? await adjustWallet(playerId, delta, session)
          : currentWallet
      finalBalance = roundMoney(updated.balance)

      const records = []
      if (bet > 0 && win > 0) {
        const afterBet = roundMoney(Math.max(0, currentBalance - bet))
        records.push(
          {
            transactionId: txKey,
            userId: oid,
            type: 'DEBIT',
            amount: bet,
            status: 'SUCCESS',
            balanceAfter: afterBet,
            gameId,
            roundId,
            provider: 'SEAMLESS',
            remarks: `Bet (${gameType || 'spin'})`,
            rawPayload: body,
          },
          {
            transactionId: `${txKey}:win`,
            userId: oid,
            type: 'CREDIT',
            amount: win,
            status: 'SUCCESS',
            balanceAfter: finalBalance,
            gameId,
            roundId,
            originalTransactionId: txKey,
            provider: 'SEAMLESS',
            remarks: `Win (${gameType || 'spin'})`,
            rawPayload: body,
          },
        )
      } else if (bet > 0) {
        records.push({
          transactionId: txKey,
          userId: oid,
          type: 'DEBIT',
          amount: bet,
          status: 'SUCCESS',
          balanceAfter: finalBalance,
          gameId,
          roundId,
          provider: 'SEAMLESS',
          remarks: `Bet (${gameType || 'spin'})`,
          rawPayload: body,
        })
      } else {
        records.push({
          transactionId: txKey,
          userId: oid,
          type: 'CREDIT',
          amount: win,
          status: 'SUCCESS',
          balanceAfter: finalBalance,
          gameId,
          roundId,
          provider: 'SEAMLESS',
          remarks: `Win (${gameType || 'spin'})`,
          rawPayload: body,
        })
      }

      await GapWalletTransaction.create(records, { session })
    })

    return res.json({
      status: true,
      message: finalBalance,
    })
  } catch (err) {
    // Handle concurrent duplicate tranid safely
    if (err?.code === 11000 && tranId) {
      const wallet = await getWallet(playerId)
      return res.json({
        status: true,
        message: roundMoney(wallet?.balance ?? 0),
      })
    }
    if (err?.code === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({
        status: false,
        message: 'Insufficient balance',
      })
    }
    throw err
  } finally {
    if (session) await session.endSession()
  }
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
      gid: req.body?.gid ?? '',
      tranid: req.body?.tranid || '',
      bet: req.body?.bet,
      win: req.body?.win,
      ttype: req.body?.ttype,
      game_type: req.body?.game_type || '',
      hasToken: Boolean(req.body?.token),
    })

    switch (opType) {
      case 2051:
        return await handleBalance(req, res)
      case 2052:
        return await handleCreditTransfer(req, res)
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
