import mongoose from 'mongoose'
import { GapWalletTransaction } from '../models/gapWalletTransaction.model.js'
import { findPlayerById, getWallet, adjustWallet } from '../store.js'
import { gapRequest } from '../services/gap.service.js'
import { auditLog } from '../utils/logger.js'

const getRequestBody = (req) =>
  req.gapPayload && typeof req.gapPayload === 'object' ? req.gapPayload : req.body || {}

const ok = (res, payload) => res.status(200).json({ success: true, status: 'SUCCESS', ...payload })
const fail = (res, code, message, payload = {}) =>
  res.status(code).json({ success: false, status: 'FAILED', message, ...payload })

function audit(req, route, status, meta = {}) {
  const body = getRequestBody(req) || {}
  auditLog('[WALLET_CALLBACK_AUDIT]', {
    route,
    method: req.method,
    timestamp: new Date().toISOString(),
    userId: body.userId || meta.userId || null,
    transactionId: body.transactionId || meta.transactionId || null,
    status,
    request: {
      userId: body.userId,
      amount: body.amount,
      transactionId: body.transactionId,
      gameId: body.gameId,
      roundId: body.roundId,
    },
    responseSummary: meta.responseSummary || null,
  })
}

async function getOrCreateWalletForUser(userId, session = null) {
  const userQ = findPlayerById(userId)
  const user = await userQ
  if (!user) return { user: null, wallet: null, userId: null }
  const id = String(user._id)
  const wallet = await getWallet(id, session)
  return { user, wallet, userId: id }
}

/** POST /api/wallet/balance  { userId } */
export async function walletBalance(req, res) {
  try {
    const { userId } = getRequestBody(req)
    audit(req, '/api/wallet/balance', 'REQUESTED')
    if (!userId) return fail(res, 400, 'userId is required')
    if (!mongoose.Types.ObjectId.isValid(String(userId))) return fail(res, 400, 'Invalid userId')

    const { user, wallet, userId: id } = await getOrCreateWalletForUser(userId)
    if (!user || !wallet) return fail(res, 404, 'User not found')

    const response = {
      balance: Number(wallet.balance || 0),
      userId: id,
      playerName: user.username || user.phone || id,
      message: 'Balance fetched successfully',
    }
    audit(req, '/api/wallet/balance', 'SUCCESS', {
      userId: id,
      responseSummary: { balance: response.balance },
    })
    return ok(res, response)
  } catch (error) {
    console.error('Wallet balance error', error.message)
    audit(req, '/api/wallet/balance', 'FAILED', { responseSummary: { message: 'Internal server error' } })
    return fail(res, 500, 'Internal server error')
  }
}

/** POST /api/wallet/debit */
export async function debitWallet(req, res) {
  let session
  try {
    const body = getRequestBody(req)
    const { userId, amount, transactionId, gameId, roundId, gapPublicKey } = body
    audit(req, '/api/wallet/debit', 'REQUESTED', { userId, transactionId })

    if (!userId || amount === undefined || !transactionId) {
      return fail(res, 400, 'userId, amount and transactionId are required', {
        transactionId: transactionId || null,
      })
    }
    if (!mongoose.Types.ObjectId.isValid(String(userId))) {
      return fail(res, 400, 'Invalid userId', { transactionId })
    }

    const debitAmount = Number(amount)
    if (!Number.isFinite(debitAmount) || debitAmount <= 0) {
      return fail(res, 400, 'amount must be a positive number', { transactionId })
    }

    const txId = String(transactionId).trim()
    const existingTx = await GapWalletTransaction.findOne({ transactionId: txId }).lean()
    if (existingTx) {
      audit(req, '/api/wallet/debit', 'SUCCESS', {
        userId,
        transactionId: txId,
        responseSummary: { duplicate: true, balance: Number(existingTx.balanceAfter || 0) },
      })
      return ok(res, {
        message: 'Duplicate transaction ignored',
        balance: Number(existingTx.balanceAfter || 0),
        transactionId: txId,
      })
    }

    session = await mongoose.startSession()
    let finalBalance = 0
    let userRef = null

    try {
      await session.withTransaction(async () => {
        const { user, userId: id } = await getOrCreateWalletForUser(userId, session)
        if (!user) {
          const err = new Error('User not found')
          err.code = 'USER_NOT_FOUND'
          throw err
        }
        userRef = user
        const wallet = await adjustWallet(id, -debitAmount, session)
        finalBalance = Number(wallet.balance || 0)

        await GapWalletTransaction.create(
          [
            {
              transactionId: txId,
              userId: user._id,
              type: 'DEBIT',
              amount: debitAmount,
              status: 'SUCCESS',
              balanceAfter: finalBalance,
              gameId: String(gameId || '').trim(),
              roundId: String(roundId || '').trim(),
              rolledBack: false,
              rawPayload: body,
              requestMeta: { ip: req.ip, source: 'gap-wallet-api' },
            },
          ],
          { session },
        )
      })
    } catch (err) {
      if (err?.code === 11000) {
        const dup = await GapWalletTransaction.findOne({ transactionId: txId }).lean()
        return ok(res, {
          message: 'Duplicate transaction ignored',
          balance: Number(dup?.balanceAfter || 0),
          transactionId: txId,
        })
      }
      if (err.code === 'INSUFFICIENT_BALANCE') {
        return fail(res, 400, 'Insufficient balance', {
          balance: Number(err.currentBalance || 0),
          transactionId: txId,
        })
      }
      if (err.code === 'USER_NOT_FOUND' || err.message === 'User not found') {
        return fail(res, 404, 'User not found', { transactionId: txId })
      }
      throw err
    }

    if (gapPublicKey) {
      try {
        await gapRequest(
          '/wallet/debit',
          {
            operatorId: process.env.OPERATOR_ID,
            userId: String(userId),
            amount: debitAmount,
            transactionId: txId,
            gameId: String(gameId || '').trim(),
            roundId: String(roundId || '').trim(),
            balance: finalBalance,
          },
          gapPublicKey,
        )
      } catch (gapError) {
        console.warn('GAP debit notify failed', gapError.message)
      }
    }

    audit(req, '/api/wallet/debit', 'SUCCESS', {
      userId,
      transactionId: txId,
      responseSummary: { balance: finalBalance },
    })
    return ok(res, {
      message: 'Debit processed successfully',
      balance: finalBalance,
      transactionId: txId,
      playerName: userRef?.username || null,
    })
  } catch (error) {
    console.error('Wallet debit error', error.message)
    audit(req, '/api/wallet/debit', 'FAILED', {
      responseSummary: { message: 'Internal server error' },
    })
    return fail(res, 500, 'Internal server error', {
      transactionId: (getRequestBody(req) || {}).transactionId || null,
    })
  } finally {
    if (session) await session.endSession()
  }
}

/** POST /api/wallet/credit */
export async function creditWallet(req, res) {
  let session
  try {
    const body = getRequestBody(req)
    const { userId, amount, transactionId, gameId, roundId, gapPublicKey } = body
    audit(req, '/api/wallet/credit', 'REQUESTED', { userId, transactionId })

    if (!userId || amount === undefined || !transactionId) {
      return fail(res, 400, 'userId, amount and transactionId are required', {
        transactionId: transactionId || null,
      })
    }
    if (!mongoose.Types.ObjectId.isValid(String(userId))) {
      return fail(res, 400, 'Invalid userId', { transactionId })
    }

    const creditAmount = Number(amount)
    if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
      return fail(res, 400, 'amount must be a positive number', { transactionId })
    }

    const txId = String(transactionId).trim()
    const existingTx = await GapWalletTransaction.findOne({ transactionId: txId }).lean()
    if (existingTx) {
      return ok(res, {
        message: 'Duplicate transaction ignored',
        balance: Number(existingTx.balanceAfter || 0),
        transactionId: txId,
      })
    }

    session = await mongoose.startSession()
    let finalBalance = 0

    try {
      await session.withTransaction(async () => {
        const { user, userId: id } = await getOrCreateWalletForUser(userId, session)
        if (!user) {
          const err = new Error('User not found')
          err.code = 'USER_NOT_FOUND'
          throw err
        }
        const wallet = await adjustWallet(id, creditAmount, session)
        finalBalance = Number(wallet.balance || 0)

        await GapWalletTransaction.create(
          [
            {
              transactionId: txId,
              userId: user._id,
              type: 'CREDIT',
              amount: creditAmount,
              status: 'SUCCESS',
              balanceAfter: finalBalance,
              gameId: String(gameId || '').trim(),
              roundId: String(roundId || '').trim(),
              rolledBack: false,
              rawPayload: body,
              requestMeta: { ip: req.ip, source: 'gap-wallet-api' },
            },
          ],
          { session },
        )
      })
    } catch (err) {
      if (err?.code === 11000) {
        const dup = await GapWalletTransaction.findOne({ transactionId: txId }).lean()
        return ok(res, {
          message: 'Duplicate transaction ignored',
          balance: Number(dup?.balanceAfter || 0),
          transactionId: txId,
        })
      }
      if (err.code === 'USER_NOT_FOUND' || err.message === 'User not found') {
        return fail(res, 404, 'User not found', { transactionId: txId })
      }
      throw err
    }

    if (gapPublicKey) {
      try {
        await gapRequest(
          '/wallet/credit',
          {
            operatorId: process.env.OPERATOR_ID,
            userId: String(userId),
            amount: creditAmount,
            transactionId: txId,
            gameId: String(gameId || '').trim(),
            roundId: String(roundId || '').trim(),
            balance: finalBalance,
          },
          gapPublicKey,
        )
      } catch (gapError) {
        console.warn('GAP credit notify failed', gapError.message)
      }
    }

    audit(req, '/api/wallet/credit', 'SUCCESS', {
      userId,
      transactionId: txId,
      responseSummary: { balance: finalBalance },
    })
    return ok(res, {
      message: 'Credit processed successfully',
      balance: finalBalance,
      transactionId: txId,
    })
  } catch (error) {
    console.error('Wallet credit error', error.message)
    audit(req, '/api/wallet/credit', 'FAILED', {
      responseSummary: { message: 'Internal server error' },
    })
    return fail(res, 500, 'Internal server error', {
      transactionId: (getRequestBody(req) || {}).transactionId || null,
    })
  } finally {
    if (session) await session.endSession()
  }
}

/** POST /api/wallet/rollback  { transactionId } */
export async function rollbackWallet(req, res) {
  let session
  try {
    const body = getRequestBody(req)
    const { transactionId } = body
    audit(req, '/api/wallet/rollback', 'REQUESTED', { transactionId })
    if (!transactionId) return fail(res, 400, 'transactionId is required')

    const txId = String(transactionId).trim()
    const existingRollback = await GapWalletTransaction.findOne({
      originalTransactionId: txId,
      type: { $in: ['ROLLBACK', 'rollback'] },
    }).lean()
    if (existingRollback) {
      return ok(res, {
        message: 'Rollback already processed',
        balance: Number(existingRollback.balanceAfter || 0),
        transactionId: txId,
      })
    }

    session = await mongoose.startSession()
    let finalBalance = 0

    try {
      await session.withTransaction(async () => {
        const originalTx = await GapWalletTransaction.findOne({
          transactionId: txId,
          type: { $in: ['DEBIT', 'debit', 'CREDIT', 'credit'] },
        }).session(session)

        if (!originalTx) {
          const err = new Error('Original transaction not found')
          err.code = 'NOT_FOUND'
          throw err
        }
        if (originalTx.rolledBack) {
          const err = new Error('ALREADY_ROLLED_BACK')
          err.code = 'ALREADY_ROLLED_BACK'
          throw err
        }

        const type = String(originalTx.type).toUpperCase()
        const delta =
          type === 'DEBIT'
            ? Number(originalTx.amount || 0)
            : -Number(originalTx.amount || 0)

        const wallet = await adjustWallet(String(originalTx.userId), delta, session)
        finalBalance = Number(wallet.balance || 0)

        originalTx.rolledBack = true
        await originalTx.save({ session })

        await GapWalletTransaction.create(
          [
            {
              transactionId: `RBK_${txId}`,
              originalTransactionId: txId,
              userId: originalTx.userId,
              type: 'ROLLBACK',
              amount: Number(originalTx.amount || 0),
              status: 'SUCCESS',
              balanceAfter: finalBalance,
              gameId: originalTx.gameId || '',
              roundId: originalTx.roundId || '',
              rolledBack: false,
              rawPayload: body,
              requestMeta: { ip: req.ip, source: 'gap-wallet-api' },
              remarks: `Rollback for ${type} transaction`,
            },
          ],
          { session },
        )
      })
    } catch (err) {
      if (err?.code === 11000 || err.code === 'ALREADY_ROLLED_BACK') {
        const existing = await GapWalletTransaction.findOne({
          originalTransactionId: txId,
          type: { $in: ['ROLLBACK', 'rollback'] },
        }).lean()
        const wallet = existing
          ? null
          : await getWallet(
              String(
                (
                  await GapWalletTransaction.findOne({ transactionId: txId }).lean()
                )?.userId || '',
              ),
            ).catch(() => null)
        return ok(res, {
          message: 'Rollback already processed',
          balance: Number(existing?.balanceAfter || wallet?.balance || 0),
          transactionId: txId,
        })
      }
      if (err.code === 'NOT_FOUND') {
        return fail(res, 404, 'Original transaction not found', { transactionId: txId })
      }
      if (err.code === 'INSUFFICIENT_BALANCE') {
        return fail(res, 400, 'Insufficient balance', {
          balance: Number(err.currentBalance || 0),
          transactionId: txId,
        })
      }
      throw err
    }

    audit(req, '/api/wallet/rollback', 'SUCCESS', {
      transactionId: txId,
      responseSummary: { balance: finalBalance },
    })
    return ok(res, {
      message: 'Rollback successful',
      balance: finalBalance,
      transactionId: txId,
    })
  } catch (error) {
    console.error('Wallet rollback error', error.message)
    audit(req, '/api/wallet/rollback', 'FAILED', {
      responseSummary: { message: 'Internal server error' },
    })
    return fail(res, 500, 'Internal server error', {
      transactionId: (getRequestBody(req) || {}).transactionId || null,
    })
  } finally {
    if (session) await session.endSession()
  }
}

/** GET /api/wallet/transaction/:transactionId */
export async function getWalletTransactionById(req, res) {
  try {
    const txId = String(req.params.transactionId || '').trim()
    if (!txId) return fail(res, 400, 'transactionId is required')
    const tx = await GapWalletTransaction.findOne({ transactionId: txId }).lean()
    if (!tx) return fail(res, 404, 'Transaction not found')
    return ok(res, { data: tx, message: 'Transaction fetched successfully' })
  } catch (error) {
    console.error('Wallet txn lookup error', error.message)
    return fail(res, 500, 'Internal server error')
  }
}
