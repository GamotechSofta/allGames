const API_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3010').replace(/\/$/, '')
const AUTH_BASE = `${API_ROOT}/api/v1`
const USER_KEY = 'allgames_user'

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  if (!user) localStorage.removeItem(USER_KEY)
  else localStorage.setItem(USER_KEY, JSON.stringify(user))
}

async function request(url, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const authToken = token || getStoredUser()?.token
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const res = await fetch(url, {
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

export const login = (payload) =>
  request(`${AUTH_BASE}/auth/login`, { method: 'POST', body: payload })
export const register = (payload) =>
  request(`${AUTH_BASE}/auth/register`, { method: 'POST', body: payload })
export const fetchMe = () => request(`${AUTH_BASE}/auth/me`)
export const fetchBalance = () => request(`${AUTH_BASE}/wallet/balance`)

export const creditWallet = (amount, extras = {}) =>
  request(`${AUTH_BASE}/wallet/credit`, {
    method: 'POST',
    body: { amount, ...extras },
  })

export const debitWallet = (amount, extras = {}) =>
  request(`${AUTH_BASE}/wallet/debit`, {
    method: 'POST',
    body: { amount, ...extras },
  })

/** Player credit/debit history from wallet APIs */
export const fetchHistory = (limit = 50) =>
  request(`${AUTH_BASE}/wallet/history?limit=${limit}`)

/** Active hero banners for the lobby */
export const fetchHeroBanners = () =>
  request(`${API_ROOT}/api/hero-banners`)

/** Enabled games for the lobby (from backend GAMES_API + OPERATOR_ID) */
export const fetchEnabledGames = () =>
  request(`${API_ROOT}/api/enabled-games`)

