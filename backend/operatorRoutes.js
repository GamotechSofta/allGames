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
  return {
    status: true,
    msg: 'ok',
    user: {
      user_id: playerIdOf(player),
      userId: playerIdOf(player),
      id: playerIdOf(player),
      username: player.username,
      display_name: player.username,
      balance: wallet.balance,
      available_balance: wallet.balance,
      currency: 'INR',
      operator_id: operatorId(),
      operatorId: operatorId(),
    },
  }
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
 * PotLudo (fashionbuddies) operator gateway contract.
 * Set PotLudo APP_OPERATOR_BASE_URL to this backend's public URL.
 */
export function registerOperatorRoutes(app) {
  app.get('/service/user/detail', userDetailHandler)
  app.get('/operator/service/user/detail', userDetailHandler)
  app.post('/service/operator/user/balance/v2', balanceV2Handler)
  app.post('/operator/service/operator/user/balance/v2', balanceV2Handler)

  app.post('/api/wallet/credit', async (req, res) => {
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
  })
}
