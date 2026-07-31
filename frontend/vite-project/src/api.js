const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1'
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

export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const authToken = token || getStoredUser()?.token
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const res = await fetch(`${API_BASE}${path}`, {
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

export const register = (payload) => api('/auth/register', { method: 'POST', body: payload })
export const login = (payload) => api('/auth/login', { method: 'POST', body: payload })
export const fetchMe = () => api('/auth/me')
export const fetchBalance = () => api('/wallet/balance')
export const fetchGames = () => api('/games')
export const launchGame = (gameCode) =>
  api(`/games/launch/${gameCode}`, {
    method: 'POST',
    body: { returnUrl: window.location.origin },
  })
