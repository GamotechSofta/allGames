import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { Admin } from '../models/admin.model.js'

const adminSecret = () =>
  process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'allgames-admin-secret'

export function signAdminToken(adminId) {
  return jwt.sign({ adminId, role: 'admin' }, adminSecret(), {
    expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '7d',
  })
}

export async function ensureDefaultAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const existing = await Admin.findOne({ username })
  if (existing) return existing
  const admin = await Admin.create({
    username,
    passwordHash: await bcrypt.hash(password, 10),
  })
  console.log(`[admin] seeded default admin "${username}"`)
  return admin
}

export function adminRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) {
    return res.status(401).json({ success: false, message: 'Admin authentication required' })
  }
  try {
    const payload = jwt.verify(token, adminSecret())
    if (!payload?.adminId) {
      return res.status(401).json({ success: false, message: 'Invalid admin token' })
    }
    req.adminId = payload.adminId
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired admin token' })
  }
}

export async function adminLogin(req, res) {
  try {
    const username = String(req.body?.username || '').trim()
    const password = String(req.body?.password || '')
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'username and password required' })
    }
    const admin = await Admin.findOne({ username })
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }
    const ok = await bcrypt.compare(password, admin.passwordHash)
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }
    const token = signAdminToken(String(admin._id))
    return res.json({
      success: true,
      data: { id: String(admin._id), username: admin.username, token },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Admin login failed' })
  }
}
