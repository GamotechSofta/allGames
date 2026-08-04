import jwt from 'jsonwebtoken'
import {
  adjustWallet,
  findPlayerById,
  getWallet,
} from './store.js'

function playerIdOf(player) {
  return String(player._id || player.id)
}

function operatorId() {
  return String(process.env.APP_OPERATOR_ID || '1')
}

function readToken(req) {
  const headerToken = req.headers.token || req.headers.Token
  if (headerToken) return String(headerToken).trim()
  const auth = req.headers.authorization || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim()
  // PotLudo / browser clients sometimes pass token in query
  const q = req.query || {}
  const fromQuery = q.token || q.id || q.Authorization || q.authorization
  if (fromQuery) return String(fromQuery).trim()
  const body = req.body || {}
  if (body.token || body.id) return String(body.token || body.id).trim()
  return ''
}

function verifyPlayerToken(token) {
  if (!token) {
    const err = new Error('Invalid or missing user token / user_id')
    err.status = 401
    throw err
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'allgames-dev-secret')
    if (!payload?.playerId) {
      const err = new Error('Invalid or missing user token / user_id')
      err.status = 401
      throw err
    }
    return String(payload.playerId)
  } catch (err) {
    if (err.status) throw err
    const next = new Error('Invalid or missing user token / user_id')
    next.status = 401
    throw next
  }
}

async function buildUserDetail(playerId) {
  const player = await findPlayerById(playerId)
  if (!player) {
    const err = new Error('Invalid or missing user token / user_id')
    err.status = 401
    throw err
  }
  const wallet = await getWallet(playerIdOf(player))
  const balance = Number(wallet.balance || 0)
  return {
    status: true,
    success: true,
    msg: 'ok',
    message: 'ok',
    // Root-level aliases (some PotLudo builds read these)
    balance,
    available_balance: balance,
    wallet: balance,
    real_wallet: balance,
    currency: 'INR',
    user: {
      user_id: playerIdOf(player),
      userId: playerIdOf(player),
      id: playerIdOf(player),
      username: player.username,
      display_name: player.username,
      balance,
      available_balance: balance,
      wallet: balance,
      real_wallet: balance,
      currency: 'INR',
      operator_id: operatorId(),
      operatorId: operatorId(),
    },
  }
}

function operatorCors(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, token, Token, X-Requested-With',
  )
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
}

async function userDetailHandler(req, res) {
  try {
    const playerId = verifyPlayerToken(readToken(req))
    return res.json(await buildUserDetail(playerId))
  } catch (err) {
    const status = err.status || 401
    return res.status(status).json({
      status: false,
      success: false,
      code: status,
      errorCode: status,
      message: err.message,
      errorMessage: err.message,
      msg: err.message,
      balance: 0,
    })
  }
}

async function balanceV2Handler(req, res) {
  try {
    const playerId = verifyPlayerToken(readToken(req))
    const amount = Number(req.body?.amount)
    const txnType = Number(req.body?.txn_type ?? 0)

    if (!(amount > 0)) {
      return res.status(400).json({ status: false, msg: 'amount must be positive' })
    }

    const delta = txnType === 0 ? -amount : amount
    const wallet = await adjustWallet(playerId, delta)

    return res.json({
      status: true,
      msg: 'ok',
      balance: wallet.balance,
      data: {
        user_id: playerId,
        balance: wallet.balance,
        currency: 'INR',
      },
    })
  } catch (err) {
    const status = err.code === 'INSUFFICIENT_BALANCE' ? 400 : err.status || 500
    return res.status(status).json({
      status: false,
      success: false,
      msg: err.message,
      message: err.message,
    })
  }
}

/**
 * Some PotLudo builds call this on the operator base URL with { id, gameId }.
 */
async function operatorSessionHandler(req, res) {
  try {
    const token = readToken(req) || String(req.body?.id || '').trim()
    const playerId = verifyPlayerToken(token)
    const detail = await buildUserDetail(playerId)
    return res.json({
      ...detail,
      token,
      gameId: req.body?.gameId || req.body?.game_id || '',
    })
  } catch (err) {
    const status = err.status || 401
    return res.status(status).json({
      status: false,
      success: false,
      message: err.message,
      msg: err.message,
      balance: 0,
    })
  }
}

/**
 * PotLudo (fashionbuddies) operator gateway contract.
 * PotLudo APP_OPERATOR_BASE_URL must point at this backend's *public* URL
 * (not 127.0.0.1 — their servers cannot reach localhost).
 */
export function registerOperatorRoutes(app) {
  app.use((req, res, next) => {
    if (
      req.path.includes('/service/user/detail') ||
      req.path.includes('/service/operator/user/balance') ||
      req.path.includes('/identity/operator/session')
    ) {
      console.log(
        '[OPERATOR]',
        req.method,
        req.path,
        'token=' + Boolean(readToken(req)),
        'ip=' + req.ip,
      )
    }
    next()
  })

  const detailPaths = [
    '/service/user/detail',
    '/operator/service/user/detail',
    '/api/service/user/detail',
    '/api/v1/service/user/detail',
  ]
  for (const p of detailPaths) {
    app.options(p, operatorCors)
    app.get(p, operatorCors, userDetailHandler)
    app.post(p, operatorCors, userDetailHandler)
  }

  const balancePaths = [
    '/service/operator/user/balance/v2',
    '/operator/service/operator/user/balance/v2',
    '/api/service/operator/user/balance/v2',
    '/api/v1/service/operator/user/balance/v2',
  ]
  for (const p of balancePaths) {
    app.options(p, operatorCors)
    app.post(p, operatorCors, balanceV2Handler)
  }

  const sessionPaths = [
    '/api/v1/identity/operator/session',
    '/identity/operator/session',
    '/api/identity/operator/session',
  ]
  for (const p of sessionPaths) {
    app.options(p, operatorCors)
    app.post(p, operatorCors, operatorSessionHandler)
  }

  async function operatorCreditHandler(req, res) {
    try {
      let playerId = req.body?.user_id || req.body?.userId || req.body?.playerId
      if (!playerId) playerId = verifyPlayerToken(readToken(req))
      const amount = Number(req.body?.amount)
      if (!playerId || !(amount > 0)) {
        return res.status(400).json({ status: false, msg: 'user_id and amount required' })
      }
      const wallet = await adjustWallet(String(playerId), amount)
      return res.json({
        status: true,
        success: true,
        msg: 'ok',
        balance: wallet.balance,
      })
    } catch (err) {
      return res.status(500).json({ status: false, msg: err.message })
    }
  }

  app.post('/service/operator/wallet/credit', operatorCors, operatorCreditHandler)
  app.post('/operator/service/operator/wallet/credit', operatorCors, operatorCreditHandler)
}
