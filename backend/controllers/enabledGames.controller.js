import axios from 'axios'

function normalizeGame(raw, index) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw._id || raw.id || raw.code || raw.slug || index)
  return {
    id,
    name: String(raw.name || raw.title || 'Game').trim(),
    slug: String(raw.slug || '').trim(),
    code: String(raw.code || '').trim(),
    status: String(raw.status || 'ACTIVE').trim(),
    thumbnail: String(raw.thumbnail || raw.image || raw.icon || '').trim(),
    launchUrl: String(raw.launchUrl || raw.url || '').trim(),
    demoUrl: String(raw.demoUrl || '').trim(),
    maintenanceMode: Boolean(raw.maintenanceMode),
  }
}

export async function listEnabledGames(_req, res) {
  const gamesApi = String(process.env.GAMES_API || '').trim()
  const operatorId = String(process.env.OPERATOR_ID || '').trim()

  if (!gamesApi || !operatorId) {
    return res.status(500).json({
      success: false,
      message: 'GAMES_API and OPERATOR_ID must be configured in backend environment',
    })
  }

  try {
    const endpoint = new URL(gamesApi)
    endpoint.searchParams.set('operatorId', operatorId)

    const response = await axios.get(endpoint.toString(), {
      timeout: 12000,
      headers: { Accept: 'application/json' },
    })

    const payload = response.data || {}
    const list = Array.isArray(payload.enabledGames)
      ? payload.enabledGames
      : Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : []

    const games = list
      .map(normalizeGame)
      .filter((g) => g && g.status.toUpperCase() === 'ACTIVE')

    return res.json({
      success: true,
      operatorId: payload.operatorId || operatorId,
      operatorName: payload.operatorName || '',
      count: games.length,
      data: games,
    })
  } catch (err) {
    const status = err.response?.status || 502
    const detail =
      err.response?.data?.message || err.message || 'Failed to fetch enabled games'
    console.error('[GAMES_API] Fetch failed:', detail)
    return res.status(status >= 400 && status < 600 ? status : 502).json({
      success: false,
      message: detail,
    })
  }
}
