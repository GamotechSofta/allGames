const SENSITIVE = [
  'password',
  'passwordHash',
  'token',
  'authorization',
  'signature',
  'x-signature',
  'x-gap-signature',
  'data',
]

export function sanitizeForLog(value, depth = 0) {
  if (value == null || depth > 4) return value
  if (Array.isArray(value)) return value.map((v) => sanitizeForLog(v, depth + 1))
  if (typeof value !== 'object') return value
  const out = {}
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE.includes(String(k).toLowerCase())) {
      out[k] = '[redacted]'
    } else {
      out[k] = sanitizeForLog(v, depth + 1)
    }
  }
  return out
}

export function auditLog(tag, details) {
  const line = sanitizeForLog(details)
  if (details?.status === 'FAILED') console.warn(tag, line)
  else console.info(tag, line)
}
