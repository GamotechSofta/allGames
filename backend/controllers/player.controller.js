import bcrypt from 'bcryptjs'
import { Player, Wallet, createPlayer, findPlayerByPhone } from '../store.js'

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
