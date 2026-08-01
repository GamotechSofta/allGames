import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { authRequired, signToken } from './auth.js'
import {
  connectDb,
  createPlayer,
  findPlayerById,
  findPlayerByPhone,
  getWallet,
} from './store.js'
import { GapWalletTransaction } from './models/gapWalletTransaction.model.js'
import mongoose from 'mongoose'
import { registerOperatorRoutes } from './operatorRoutes.js'
import { validateGapEnv } from './validateEnv.js'
import { ensureDefaultAdmin } from './middleware/adminAuth.js'
import { seedDirectGames } from './seedDirectGames.js'
import adminRoutes from './routes/admin.routes.js'
import gameRoutes from './routes/game.routes.js'
import walletRoutes from './routes/wallet.routes.js'

const app = express()
const PORT = Number(process.env.PORT) || 3010

function parseCorsOrigins() {
  const raw = String(process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!raw.length) return true // reflect request origin in dev if unset
  if (raw.includes('*')) return true
  return raw
}

const corsOrigins = parseCorsOrigins()
const corsCredentials =
  String(process.env.CORS_CREDENTIALS || 'true').toLowerCase() !== 'false'

app.use(
  cors({
    origin: corsOrigins,
    credentials: corsCredentials,
  }),
)
app.use(express.json({ limit: '1mb' }))

registerOperatorRoutes(app)

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

app.get('/api/health', (_req, res) => {
  res.json({ success: true, service: 'allgames-backend' })
})

app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone)
    const password = String(req.body?.password || '')
    const username = String(req.body?.username || '').trim() || `Player${phone.slice(-4)}`
    const startingBalance = Number(process.env.STARTING_BALANCE ?? 10000)

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
      startingBalance: Number.isFinite(startingBalance) ? Math.max(0, startingBalance) : 10000,
    })

    const token = signToken(playerIdOf(player))
    return res.status(201).json({
      success: true,
      message: 'Account created',
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

/** Player JWT balance (GET) — registered before GAP wallet router mount */
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

/** Player JWT wallet history from credit/debit APIs */
app.get('/api/v1/wallet/history', authRequired, async (req, res) => {
  try {
    const playerId = String(req.playerId || '')
    if (!mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({ success: false, message: 'Invalid player' })
    }

    const oid = new mongoose.Types.ObjectId(playerId)
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)

    const transactions = await GapWalletTransaction.find({
      userId: oid,
      type: { $in: ['DEBIT', 'CREDIT', 'debit', 'credit'] },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    const rows = transactions.map((t) => {
      const type = String(t.type || '').toUpperCase()
      return {
        id: String(t._id),
        kind: type,
        type,
        amount: Number(t.amount) || 0,
        balanceAfter: Number(t.balanceAfter) || 0,
        status: t.status || 'SUCCESS',
        gameId: t.gameId || '',
        gameTitle: t.gameId || 'Wallet',
        roundId: t.roundId || '',
        transactionId: t.transactionId,
        rolledBack: Boolean(t.rolledBack),
        createdAt: t.createdAt,
      }
    })

    return res.json({
      success: true,
      data: {
        transactions: rows,
        feed: rows,
      },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Failed to load wallet history' })
  }
})

app.use('/api/admin', adminRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/game', gameRoutes)
app.use('/api/v1/game', gameRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/v1/wallet', walletRoutes)

async function start() {
  validateGapEnv()
  await connectDb(process.env.MONGODB_URI)
  await ensureDefaultAdmin()
  await seedDirectGames()
  app.listen(PORT, () => {
    console.log(`allGames backend listening on http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
