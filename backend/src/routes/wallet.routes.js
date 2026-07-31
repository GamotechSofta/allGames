import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { verifyGapSignature } from '../middleware/gapAuth.middleware.js'
import {
  walletBalance,
  debitWallet,
  creditWallet,
  rollbackWallet,
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

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'wallet-api-ok' })
})

router.post('/balance', walletLimiter, verifyGapSignature, walletBalance)
router.post('/debit', walletLimiter, verifyGapSignature, debitWallet)
router.post('/credit', walletLimiter, verifyGapSignature, creditWallet)
router.post('/rollback', walletLimiter, verifyGapSignature, rollbackWallet)

export default router
