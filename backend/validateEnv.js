import fs from 'fs'
import path from 'path'

function resolvePemPath(filePath) {
  if (!filePath) return ''
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)
}

/**
 * Validate GAP_* and OPERATOR_ID at startup.
 * Production: missing required vars exit.
 * Development: warn; allow mock launch when keys/GAP unreachable.
 */
export function validateGapEnv() {
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production'
  const warnings = []
  const errors = []

  if (!process.env.GAP_BASE_URL) {
    ;(isProd ? errors : warnings).push('Missing GAP_BASE_URL')
  }
  if (!process.env.OPERATOR_ID) {
    ;(isProd ? errors : warnings).push('Missing OPERATOR_ID')
  }

  const priv = resolvePemPath(process.env.GAP_PRIVATE_KEY_PATH || '')
  const pub = resolvePemPath(process.env.GAP_PUBLIC_KEY_PATH || '')
  if (!priv || !fs.existsSync(priv)) {
    ;(isProd ? errors : warnings).push('GAP_PRIVATE_KEY_PATH missing or file not found')
  }
  if (!pub || !fs.existsSync(pub)) {
    ;(isProd ? errors : warnings).push('GAP_PUBLIC_KEY_PATH missing or file not found')
  }

  const signatureEnabled =
    String(process.env.GAP_SIGNATURE_ENABLED || 'false').toLowerCase() === 'true'
  if (signatureEnabled && (!pub || !fs.existsSync(pub)) && !String(process.env.GAP_PUBLIC_KEY || '').trim()) {
    ;(isProd ? errors : warnings).push(
      'GAP_SIGNATURE_ENABLED=true but no GAP public key configured',
    )
  }

  for (const w of warnings) console.warn(`[env] ${w}`)
  if (errors.length) {
    for (const e of errors) console.error(`[env] ${e}`)
    throw new Error(`Invalid GAP environment: ${errors.join('; ')}`)
  }
}
