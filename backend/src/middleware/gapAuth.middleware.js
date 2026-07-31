import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { decryptWithPrivateKey, gapConfig } from '../services/gap.service.js'

function resolvePemPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)
}

function getGapPublicKey() {
  const inlineKey = String(process.env.GAP_PUBLIC_KEY || '').trim()
  if (inlineKey) return inlineKey
  const publicPath = resolvePemPath(gapConfig.GAP_PUBLIC_KEY_PATH || '')
  if (!publicPath || !fs.existsSync(publicPath)) {
    throw new Error('GAP public key file not found. Check GAP_PUBLIC_KEY_PATH')
  }
  return fs.readFileSync(publicPath, 'utf8')
}

/**
 * Optional RSA signature verify for GAP wallet callbacks.
 * When GAP_SIGNATURE_ENABLED=false, accepts plain JSON body.
 */
export function verifyGapSignature(req, res, next) {
  try {
    const enabled = String(process.env.GAP_SIGNATURE_ENABLED || 'false').toLowerCase() === 'true'
    if (!enabled) {
      req.gapPayload = req.body || null
      return next()
    }

    const encryptedData = req.body?.data
    const signature =
      req.get('Signature') ||
      req.get('x-signature') ||
      req.get('x-gap-signature') ||
      req.headers.signature ||
      req.headers['x-signature'] ||
      req.headers['x-gap-signature']

    if (!signature) {
      return res.status(401).json({
        success: false,
        code: 'MISSING_SIGNATURE',
        message: 'Missing signature',
      })
    }

    const publicKey = getGapPublicKey()
    const verifier = crypto.createVerify('RSA-SHA256')
    const payloadForVerify = encryptedData ? String(encryptedData) : JSON.stringify(req.body || {})
    verifier.update(payloadForVerify, 'utf8')
    verifier.end()
    const ok = verifier.verify(publicKey, String(signature), 'base64')

    if (!ok) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_SIGNATURE',
        message: 'Invalid signature',
      })
    }

    if (encryptedData) {
      const decryptedText = decryptWithPrivateKey(String(encryptedData))
      let parsed = {}
      try {
        parsed = JSON.parse(decryptedText)
      } catch {
        return res.status(400).json({
          success: false,
          code: 'INVALID_ENCRYPTED_PAYLOAD',
          message: 'Invalid encrypted payload JSON',
        })
      }
      req.gapPayload =
        parsed?.payload && typeof parsed.payload === 'object' ? parsed.payload : parsed
    } else {
      req.gapPayload = req.body || null
    }

    return next()
  } catch (error) {
    console.error('[GAP auth]', error.message)
    return res.status(401).json({
      success: false,
      code: 'SIGNATURE_VERIFICATION_ERROR',
      message: 'Invalid signature',
    })
  }
}
