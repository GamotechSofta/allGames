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

export const listGames = () => api('/admin/game/list')
export const addGame = (payload) => api('/admin/game/add', { method: 'POST', body: payload })
export const toggleGame = (payload) => api('/admin/game/toggle', { method: 'PUT', body: payload })
export const updateGameLaunchUrl = (payload) =>
  api('/admin/game/launch-url', { method: 'PUT', body: payload })
export const deleteGame = (payload) =>
  api('/admin/game/delete', { method: 'DELETE', body: payload })

export const listPlayers = () => api('/admin/player/list')
export const addPlayer = (payload) =>
  api('/admin/player/add', { method: 'POST', body: payload })
