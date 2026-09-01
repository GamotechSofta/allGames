import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import mongoose from 'mongoose'
import { GapWalletTransaction } from '../models/gapWalletTransaction.model.js'
import { Player, Wallet, adjustWallet, createPlayer, findPlayerById, findPlayerByPhone, getWallet } from '../store.js'

function normalizePhone(raw) {
  return String(raw || '').replace(/\D/g, '').slice(0, 10)
}

function playerIdOf(player) {
  return String(player._id || player.id)
}

/** POST /api/admin/player/add */
export async function addPlayer(req, res) {
  try {
    const phone = normalizePhone(req.body?.phone)
    const password = String(req.body?.password || '')
    const username = String(req.body?.username || '').trim() || `Player${phone.slice(-4)}`
    const startingBalance = Number(
      req.body?.balance ?? req.body?.startingBalance ?? process.env.STARTING_BALANCE ?? 10000,
    )

    if (phone.length < 10 || password.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Valid 10-digit phone and password (min 4 chars) are required',
      })
    }

    if (await findPlayerByPhone(phone)) {
      return res.status(409).json({ success: false, message: 'Phone already registered' })
    }

    const player = await createPlayer({
      phone,
      username,
      passwordHash: await bcrypt.hash(password, 10),
      startingBalance: Number.isFinite(startingBalance) ? Math.max(0, startingBalance) : 0,
    })

    const wallet = await Wallet.findOne({
      $or: [{ userId: player._id }, { playerId: player._id }],
    }).lean()

    return res.status(201).json({
      success: true,
      message: 'Player created. They can sign in on the frontend.',
      data: {
        id: playerIdOf(player),
        username: player.username,
        phone: player.phone,
        balance: wallet?.balance ?? 0,
      },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Failed to create player' })
  }
}

async function adminAdjustPlayerBalance(req, res, { type, deltaSign }) {
  try {
    const playerId = String(req.body?.playerId || req.body?.userId || '').trim()
    const amount = Number(req.body?.amount)
    const remarks = String(req.body?.remarks || '').trim()

    if (!playerId || !mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({ success: false, message: 'Valid playerId is required' })
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'amount must be a positive number' })
    }

    const player = await findPlayerById(playerId)
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' })
    }

    const txId =
      String(req.body?.transactionId || '').trim() ||
      `ADM_${type === 'CREDIT' ? 'CR' : 'DB'}_${nanoid(16)}`

    const existingTx = await GapWalletTransaction.findOne({ transactionId: txId }).lean()
    if (existingTx) {
      return res.json({
        success: true,
        message: 'Duplicate transaction ignored',
        data: {
          playerId,
          balance: Number(existingTx.balanceAfter || 0),
          transactionId: txId,
          amount,
        },
      })
    }

    const session = await mongoose.startSession()
    let finalBalance = 0

    try {
      await session.withTransaction(async () => {
        const wallet = await adjustWallet(playerId, deltaSign * amount, session)
        finalBalance = Number(wallet.balance || 0)

        await GapWalletTransaction.create(
          [
            {
              transactionId: txId,
              userId: player._id,
              type,
              amount,
              status: 'SUCCESS',
              balanceAfter: finalBalance,
              rolledBack: false,
              rawPayload: req.body || {},
              requestMeta: { ip: req.ip, source: 'admin-api', adminId: req.adminId || null },
              provider: 'ADMIN',
              remarks,
            },
          ],
          { session },
        )
      })
    } catch (err) {
      if (err?.code === 11000) {
        const dup = await GapWalletTransaction.findOne({ transactionId: txId }).lean()
        return res.json({
          success: true,
          message: 'Duplicate transaction ignored',
          data: {
            playerId,
            balance: Number(dup?.balanceAfter || 0),
            transactionId: txId,
            amount,
          },
        })
      }
      if (err.code === 'INSUFFICIENT_BALANCE') {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance',
          data: { balance: Number(err.currentBalance || 0) },
        })
      }
      throw err
    } finally {
      await session.endSession()
    }

    return res.json({
      success: true,
      message: type === 'CREDIT' ? 'Player credited successfully' : 'Player debited successfully',
      data: {
        playerId,
        balance: finalBalance,
        transactionId: txId,
        amount,
      },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Failed to update player balance' })
  }
}

/** POST /api/admin/player/credit */
export async function creditPlayer(req, res) {
  return adminAdjustPlayerBalance(req, res, { type: 'CREDIT', deltaSign: 1 })
}

/** POST /api/admin/player/debit */
export async function debitPlayer(req, res) {
  return adminAdjustPlayerBalance(req, res, { type: 'DEBIT', deltaSign: -1 })
}

/** PUT /api/admin/player/wallet — set player wallet to an exact balance */
export async function updatePlayerWallet(req, res) {
  try {
    const playerId = String(req.body?.playerId || req.body?.userId || '').trim()
    const targetBalance = Number(req.body?.balance)

    if (!playerId || !mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({ success: false, message: 'Valid playerId is required' })
    }
    if (!Number.isFinite(targetBalance) || targetBalance < 0) {
      return res.status(400).json({
        success: false,
        message: 'balance must be a non-negative number',
      })
    }

    const player = await findPlayerById(playerId)
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' })
    }

    const wallet = await getWallet(playerId)
    const currentBalance = Number(wallet.balance || 0)
    const delta = targetBalance - currentBalance

    if (delta === 0) {
      return res.json({
        success: true,
        message: 'Wallet unchanged',
        data: { playerId, balance: currentBalance },
      })
    }

    const type = delta > 0 ? 'CREDIT' : 'DEBIT'
    const amount = Math.abs(delta)
    const remarks = String(req.body?.remarks || '').trim() || `Admin set wallet to ${targetBalance}`

    req.body = {
      ...req.body,
      playerId,
      amount,
      remarks,
    }

    return adminAdjustPlayerBalance(req, res, {
      type,
      deltaSign: delta > 0 ? 1 : -1,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Failed to update player wallet' })
  }
}

/** GET /api/admin/player/list */
export async function listPlayers(_req, res) {
  try {
    const players = await Player.find({}).sort({ createdAt: -1 }).lean()
    const ids = players.map((p) => p._id)
    const wallets = await Wallet.find({
      $or: [{ userId: { $in: ids } }, { playerId: { $in: ids } }],
    }).lean()
    const walletMap = Object.fromEntries(
      wallets.map((w) => [String(w.userId || w.playerId), w.balance ?? 0]),
    )

    return res.json({
      success: true,
      data: players.map((p) => ({
        id: String(p._id),
        username: p.username,
        phone: p.phone,
        balance: walletMap[String(p._id)] ?? 0,
        createdAt: p.createdAt,
      })),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Failed to list players' })
  }
}
