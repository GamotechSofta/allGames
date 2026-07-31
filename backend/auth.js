import jwt from 'jsonwebtoken'

export function signToken(playerId) {
  return jwt.sign(
    { playerId },
    process.env.JWT_SECRET || 'allgames-dev-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  )
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' })
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'allgames-dev-secret')
    req.playerId = payload.playerId
    req.token = token
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}
