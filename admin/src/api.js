const API_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3010').replace(/\/$/, '')
const ADMIN_KEY = 'allgames_admin'

export function getAdmin() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null')
  } catch {
    return null
  }
}

export function setAdmin(admin) {
  if (!admin) localStorage.removeItem(ADMIN_KEY)
  else localStorage.setItem(ADMIN_KEY, JSON.stringify(admin))
}

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const auth = token || getAdmin()?.token
  if (auth) headers.Authorization = `Bearer ${auth}`
  const res = await fetch(`${API_ROOT}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${res.status})`)
  }
  return data
}

export const adminLogin = (username, password) =>
  api('/admin/login', { method: 'POST', body: { username, password } })

export const listPlayers = () => api('/admin/player/list')
export const addPlayer = (payload) =>
  api('/admin/player/add', { method: 'POST', body: payload })
export const creditPlayer = (payload) =>
  api('/admin/player/credit', { method: 'POST', body: payload })
export const debitPlayer = (payload) =>
  api('/admin/player/debit', { method: 'POST', body: payload })
export const updatePlayerWallet = (payload) =>
  api('/admin/player/wallet', { method: 'POST', body: payload })
export const togglePlayerSuspension = (payload) =>
  api('/admin/player/suspend', { method: 'POST', body: payload })
export const fetchPlayerHistory = (playerId, limit = 50) =>
  api(`/admin/player/history?playerId=${encodeURIComponent(playerId)}&limit=${limit}`)

export const listHeroBanners = () => api('/admin/hero-banners')
export const addHeroBanner = (payload) =>
  api('/admin/hero-banners', { method: 'POST', body: payload })
export const updateHeroBanner = (id, payload) =>
  api(`/admin/hero-banners/${encodeURIComponent(id)}`, { method: 'PUT', body: payload })
export const toggleHeroBanner = (id, payload = {}) =>
  api(`/admin/hero-banners/${encodeURIComponent(id)}/toggle`, {
    method: 'PUT',
    body: payload,
  })
export const deleteHeroBanner = (id) =>
  api(`/admin/hero-banners/${encodeURIComponent(id)}`, { method: 'DELETE' })

