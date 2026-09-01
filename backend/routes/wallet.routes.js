import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authRequired } from '../auth.js'
import { verifyGapSignature } from '../middleware/gapAuth.middleware.js'
import { adminRequired } from '../middleware/adminAuth.js'
import {
  walletBalance,
  debitWallet,
  creditWallet,
  rollbackWallet,
  getWalletTransactionById,
  genericUserWalletCredit,
} from '../controllers/wallet.controller.js'

const router = Router()

const walletLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.GAP_WALLET_RATE_LIMIT_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 'FAILED',
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please retry shortly.',
  },
})

const isProd = () => String(process.env.NODE_ENV || '').toLowerCase() === 'production'

const verifyLookupAccess = async (req, res, next) => {
  if (!isProd()) {
    const headerSecret = String(req.headers['x-gap-secret'] || '').trim()
    const expectedSecret = String(process.env.GAP_LOOKUP_SECRET || '').trim()
    if (expectedSecret && headerSecret && headerSecret === expectedSecret) {
      return next()
    }
  }
  return adminRequired(req, res, next)
}

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'wallet-api-ok' })
})

router.post('/balance', walletLimiter, verifyGapSignature, walletBalance)
router.post('/debit', walletLimiter, verifyGapSignature, debitWallet)
router.post('/credit', walletLimiter, verifyGapSignature, creditWallet)
router.post('/credit/user', walletLimiter, authRequired, genericUserWalletCredit)
router.post('/rollback', walletLimiter, verifyGapSignature, rollbackWallet)
router.get(
  '/transaction/:transactionId',
  walletLimiter,
  verifyLookupAccess,
  getWalletTransactionById,
)

export default router
