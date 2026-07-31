import mongoose from 'mongoose'
import { GapWalletTransaction } from '../models/gapWalletTransaction.model.js'
import { findPlayerById, getWallet, adjustWallet } from '../store.js'

const getRequestBody = (req) =>
  req.gapPayload && typeof req.gapPayload === 'object' ? req.gapPayload : req.body || {}

const ok = (res, payload) => res.status(200).json({ success: true, status: 'SUCCESS', ...payload })
const fail = (res, code, message, payload = {}) =>
  res.status(code).json({ success: false, status: 'FAILED', message, ...payload })

async function getOrCreateWalletForUser(userId) {
  const user = await findPlayerById(userId)
  if (!user) return { user: null, wallet: null }
  const id = String(user._id)
  const wallet = await getWallet(id)
  return { user, wallet, userId: id }
}

/** POST /api/wallet/balance  { userId } */
export async function walletBalance(req, res) {
  try {
    const { userId } = getRequestBody(req)
    if (!userId) return fail(res, 400, 'userId is required')
    if (!mongoose.Types.ObjectId.isValid(String(userId))) return fail(res, 400, 'Invalid userId')

    const { user, wallet } = await getOrCreateWalletForUser(userId)
    if (!user || !wallet) return fail(res, 404, 'User not found')

    return ok(res, {
      balance: Number(wallet.balance || 0),
      message: 'Balance fetched successfully',
    })
  } catch (error) {
    console.error('Wallet balance error', error.message)
    return fail(res, 500, 'Internal server error')
  }
}

/** POST /api/wallet/debit */
export async function debitWallet(req, res) {
  try {
    const body = getRequestBody(req)
    const { userId, amount, transactionId, gameId, roundId } = body

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
      return ok(res, {
        message: 'Duplicate transaction ignored',
        balance: Number(existingTx.balanceAfter || 0),
        transactionId: txId,
      })
    }

    const { user, userId: id } = await getOrCreateWalletForUser(userId)
    if (!user) return fail(res, 404, 'User not found', { transactionId: txId })

    let wallet
    try {
      wallet = await adjustWallet(id, -debitAmount)
    } catch (err) {
      if (err.code === 'INSUFFICIENT_BALANCE') {
        const current = await getWallet(id)
        return fail(res, 400, 'Insufficient balance', {
          balance: Number(current.balance || 0),
          transactionId: txId,
        })
      }
      throw err
    }

    try {
      await GapWalletTransaction.create({
        transactionId: txId,
        userId: user._id,
        type: 'DEBIT',
        amount: debitAmount,
        status: 'SUCCESS',
        balanceAfter: Number(wallet.balance || 0),
        gameId: String(gameId || '').trim(),
        roundId: String(roundId || '').trim(),
        rolledBack: false,
        rawPayload: body,
        requestMeta: { ip: req.ip, source: 'gap-wallet-api' },
      })
    } catch (err) {
      if (err?.code === 11000) {
        const dup = await GapWalletTransaction.findOne({ transactionId: txId }).lean()
        return ok(res, {
          message: 'Duplicate transaction ignored',
          balance: Number(dup?.balanceAfter || wallet.balance || 0),
          transactionId: txId,
        })
      }
      throw err
    }

    return ok(res, {
      message: 'Debit processed successfully',
      balance: Number(wallet.balance || 0),
      transactionId: txId,
    })
  } catch (error) {
    console.error('Wallet debit error', error.message)
    return fail(res, 500, 'Internal server error', {
      transactionId: (getRequestBody(req) || {}).transactionId || null,
    })
  }
}

/** POST /api/wallet/credit */
export async function creditWallet(req, res) {
  try {
    const body = getRequestBody(req)
    const { userId, amount, transactionId, gameId, roundId } = body

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

    const { user, userId: id } = await getOrCreateWalletForUser(userId)
    if (!user) return fail(res, 404, 'User not found', { transactionId: txId })

    const wallet = await adjustWallet(id, creditAmount)

    try {
      await GapWalletTransaction.create({
        transactionId: txId,
        userId: user._id,
        type: 'CREDIT',
        amount: creditAmount,
        status: 'SUCCESS',
        balanceAfter: Number(wallet.balance || 0),
        gameId: String(gameId || '').trim(),
        roundId: String(roundId || '').trim(),
        rolledBack: false,
        rawPayload: body,
        requestMeta: { ip: req.ip, source: 'gap-wallet-api' },
      })
    } catch (err) {
      if (err?.code === 11000) {
        const dup = await GapWalletTransaction.findOne({ transactionId: txId }).lean()
        return ok(res, {
          message: 'Duplicate transaction ignored',
          balance: Number(dup?.balanceAfter || wallet.balance || 0),
          transactionId: txId,
        })
      }
      throw err
    }

    return ok(res, {
      message: 'Credit processed successfully',
      balance: Number(wallet.balance || 0),
      transactionId: txId,
    })
  } catch (error) {
    console.error('Wallet credit error', error.message)
    return fail(res, 500, 'Internal server error', {
      transactionId: (getRequestBody(req) || {}).transactionId || null,
    })
  }
}

/** POST /api/wallet/rollback  { transactionId } */
export async function rollbackWallet(req, res) {
  try {
    const body = getRequestBody(req)
    const { transactionId } = body
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

    const originalTx = await GapWalletTransaction.findOne({
      transactionId: txId,
      type: { $in: ['DEBIT', 'debit'] },
    })
    if (!originalTx) {
      return fail(res, 404, 'Original debit transaction not found', { transactionId: txId })
    }
    if (originalTx.rolledBack) {
      const wallet = await getWallet(String(originalTx.userId))
      return ok(res, {
        message: 'Rollback already processed',
        balance: Number(wallet.balance || 0),
        transactionId: txId,
      })
    }

    const wallet = await adjustWallet(String(originalTx.userId), Number(originalTx.amount || 0))
    originalTx.rolledBack = true
    await originalTx.save()

    await GapWalletTransaction.create({
      transactionId: `RBK_${txId}`,
      originalTransactionId: txId,
      userId: originalTx.userId,
      type: 'ROLLBACK',
      amount: Number(originalTx.amount || 0),
      status: 'SUCCESS',
      balanceAfter: Number(wallet.balance || 0),
      gameId: originalTx.gameId || '',
      roundId: originalTx.roundId || '',
      rolledBack: false,
      rawPayload: body,
      requestMeta: { ip: req.ip, source: 'gap-wallet-api' },
      remarks: 'Rollback for debit transaction',
    })

    return ok(res, {
      message: 'Rollback successful',
      balance: Number(wallet.balance || 0),
      transactionId: txId,
    })
  } catch (error) {
    if (error?.code === 11000) {
      const txId = String((getRequestBody(req) || {}).transactionId || '').trim()
      const existingRollback = await GapWalletTransaction.findOne({
        originalTransactionId: txId,
        type: { $in: ['ROLLBACK', 'rollback'] },
      }).lean()
      return ok(res, {
        message: 'Rollback already processed',
        balance: Number(existingRollback?.balanceAfter || 0),
        transactionId: txId,
      })
    }
    console.error('Wallet rollback error', error.message)
    return fail(res, 500, 'Internal server error', {
      transactionId: (getRequestBody(req) || {}).transactionId || null,
    })
  }
}
