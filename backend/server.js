import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { authRequired, signToken } from './src/auth.js'
import {
  adjustWallet,
  connectDb,
  createPlayer,
  findPlayerById,
  findPlayerByPhone,
  getWallet,
} from './src/store.js'
import { buildLaunchUrl, CATALOG } from './src/launch.js'

const app = express()
const PORT = Number(process.env.PORT) || 3010
const STARTING_BALANCE = Number(process.env.STARTING_BALANCE) || 10000

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

function normalizePhone(raw) {
  return String(raw || '').replace(/\D/g, '').slice(0, 10)
}

function playerIdOf(player) {
  return String(player._id || player.id)
}

async function playerPayload(player, token) {
  const wallet = await getWallet(playerIdOf(player))
  return {
    id: playerIdOf(player),
    playerId: playerIdOf(player),
    username: player.username,
    phone: player.phone,
    balance: wallet.balance,
    token,
  }
}

app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, service: 'allgames-backend' })
})

app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone)
    const password = String(req.body?.password || '')
    const username = String(req.body?.username || '').trim() || `Player${phone.slice(-4)}`

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
      startingBalance: STARTING_BALANCE,
    })

    const token = signToken(playerIdOf(player))
    return res.status(201).json({
      success: true,
      message: 'Registered successfully',
      data: await playerPayload(player, token),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Registration failed' })
  }
})

app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone)
    const password = String(req.body?.password || '')

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Phone and password are required' })
    }

    const player = await findPlayerByPhone(phone)
    if (!player) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const ok = await bcrypt.compare(password, player.passwordHash)
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const token = signToken(playerIdOf(player))
    return res.json({
      success: true,
      message: 'Login successful',
      data: await playerPayload(player, token),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Login failed' })
  }
})

app.get('/api/v1/auth/me', authRequired, async (req, res) => {
  try {
    const player = await findPlayerById(req.playerId)
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' })
    }
    return res.json({
      success: true,
      data: await playerPayload(player, req.token),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Failed to load profile' })
  }
})

app.get('/api/v1/wallet/balance', authRequired, async (req, res) => {
  try {
    const wallet = await getWallet(req.playerId)
    return res.json({
      success: true,
      data: { playerId: req.playerId, balance: wallet.balance, currency: 'INR' },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Failed to load balance' })
  }
})

app.post('/api/v1/wallet/balance', async (req, res) => {
  try {
    const playerId =
      req.body?.playerId ||
      req.body?.userId ||
      req.body?.externalPlayerId ||
      req.query?.playerId ||
      req.query?.userId

    if (!playerId) {
      return res.status(400).json({ success: false, message: 'playerId is required' })
    }

    const player = await findPlayerById(String(playerId))
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' })
    }

    const id = playerIdOf(player)
    const wallet = await getWallet(id)
    return res.json({
      success: true,
      data: { playerId: id, balance: wallet.balance, currency: 'INR' },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Failed to load balance' })
  }
})

app.post('/api/v1/wallet/debit', async (req, res) => {
  try {
    const playerId = req.body?.playerId || req.body?.userId
    const amount = Number(req.body?.amount)
    if (!playerId || !(amount > 0)) {
      return res.status(400).json({ success: false, message: 'playerId and positive amount required' })
    }
    if (!(await findPlayerById(String(playerId)))) {
      return res.status(404).json({ success: false, message: 'Player not found' })
    }
    const wallet = await adjustWallet(String(playerId), -amount)
    return res.json({
      success: true,
      data: { playerId, balance: wallet.balance, currency: 'INR' },
    })
  } catch (err) {
    if (err.code === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({ success: false, message: err.message })
    }
    console.error(err)
    return res.status(500).json({ success: false, message: 'Debit failed' })
  }
})

app.post('/api/v1/wallet/credit', async (req, res) => {
  try {
    const playerId = req.body?.playerId || req.body?.userId
    const amount = Number(req.body?.amount)
    if (!playerId || !(amount > 0)) {
      return res.status(400).json({ success: false, message: 'playerId and positive amount required' })
    }
    if (!(await findPlayerById(String(playerId)))) {
      return res.status(404).json({ success: false, message: 'Player not found' })
    }
    const wallet = await adjustWallet(String(playerId), amount)
    return res.json({
      success: true,
      data: { playerId, balance: wallet.balance, currency: 'INR' },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Credit failed' })
  }
})

app.get('/api/v1/games', (_req, res) => {
  res.json({ success: true, data: CATALOG })
})

app.post('/api/v1/games/launch/:gameCode', authRequired, async (req, res) => {
  try {
    const player = await findPlayerById(req.playerId)
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' })
    }

    const id = playerIdOf(player)
    const wallet = await getWallet(id)
    const returnUrl =
      req.body?.returnUrl ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173'

    const launchUrl = buildLaunchUrl(req.params.gameCode, {
      playerId: id,
      token: req.token,
      balance: wallet.balance,
      username: player.username,
      phone: player.phone,
      returnUrl,
    })

    return res.json({
      success: true,
      gameCode: String(req.params.gameCode).toUpperCase(),
      launchUrl,
      playerId: id,
      balance: wallet.balance,
    })
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || 'Launch failed' })
  }
})

async function start() {
  await connectDb(process.env.MONGODB_URI)
  app.listen(PORT, () => {
    console.log(`allGames backend listening on http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
