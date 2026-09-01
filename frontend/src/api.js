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

export const fetchGames = () =>
  request(`${API_ROOT}/api/game/list?fields=home&limit=24`)

/** Player game history: launches + wallet credit/debit rows */
export const fetchGameHistory = (limit = 50) =>
  request(`${API_ROOT}/api/game/history?limit=${limit}`)

/** Player credit/debit history from wallet APIs */
export const fetchHistory = (limit = 50) =>
  request(`${AUTH_BASE}/wallet/history?limit=${limit}`)

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

  // Never send localhost returnUrl to public game hosts (Chrome PNA block)
  let returnUrl = ''
  try {
    const host = window.location.hostname.toLowerCase()
    const isPrivate =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    if (!isPrivate) returnUrl = `${window.location.origin}/?tab=games`
  } catch {
    /* ignore */
  }

  const res = await request(`${API_ROOT}/api/game/launch`, {
    method: 'POST',
    body: {
      userId: user.id || user.playerId,
      gameId,
      ...(returnUrl ? { returnUrl } : {}),
    },
  })
  const launchUrl = extractLaunchUrl(res)
  if (!launchUrl) throw new Error('Launch URL missing from response')
  return { ...res, launchUrl }
}
