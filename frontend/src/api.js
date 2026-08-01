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

export const fetchGames = () =>
  request(`${API_ROOT}/api/game/list?fields=home&limit=24`)

export const fetchHistory = (limit = 50) =>
  request(`${API_ROOT}/api/game/history?limit=${limit}`)

export function extractLaunchUrl(res) {
  return (
    res?.launchUrl ||
    res?.data?.launchUrl ||
    res?.url ||
    res?.gameUrl ||
    res?.sessionUrl ||
    res?.redirectUrl ||
    ''
  )
}

export async function launchGame(gameId) {
  const user = getStoredUser()
  if (!user?.id && !user?.playerId) throw new Error('Not logged in')
  const res = await request(`${API_ROOT}/api/game/launch`, {
    method: 'POST',
    body: {
      userId: user.id || user.playerId,
      gameId,
    },
  })
  const launchUrl = extractLaunchUrl(res)
  if (!launchUrl) throw new Error('Launch URL missing from response')
  return { ...res, launchUrl }
}
