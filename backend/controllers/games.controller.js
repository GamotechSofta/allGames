import axios from 'axios'

const DEFAULT_OPERATIONS_BASE = 'https://operations.dpbossking.com'

function normalizeGame(raw, index) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id ?? raw._id ?? raw.code ?? index)
  const code = String(raw.code || raw.id || '').trim()
  const name = String(raw.name || raw.title || code || 'Game').trim()
  const slug = String(raw.slug || code || id)
    .trim()
    .toLowerCase()

  return {
    id,
    name,
    code,
    slug,
    provider: String(raw.provider || '').trim(),
    device: Array.isArray(raw.device) ? raw.device : [],
    currencies: Array.isArray(raw.currencies) ? raw.currencies : [],
    thumbnail: String(raw.media || raw.image || raw.thumbnail || raw.icon || '').trim(),
    launchUrl: String(raw.launchUrl || raw.url || '').trim(),
    demoUrl: String(raw.demoUrl || '').trim(),
    maintenanceMode: Boolean(raw.maintenanceMode),
  }
}

export async function listGames(_req, res) {
  const partnerCode = String(process.env.PARTNER_CODE || '').trim()
  const privateApiKey = String(process.env.PRIVATE_API_KEY || '').trim()
  const baseUrl = String(
    process.env.OPERATIONS_API_BASE || DEFAULT_OPERATIONS_BASE,
  )
    .trim()
    .replace(/\/$/, '')

  if (!partnerCode || !privateApiKey) {
    return res.status(500).json({
      success: false,
      message: 'PARTNER_CODE and PRIVATE_API_KEY must be configured in backend environment',
    })
  }

  try {
    const partnerPath = partnerCode.startsWith('/') ? partnerCode : `/${partnerCode}`
    const endpoint = `${baseUrl}${partnerPath}`
    const host = new URL(endpoint).host

    const response = await axios.post(
      endpoint,
      { opType: 1071 },
      {
        timeout: 12000,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Api-Key': privateApiKey,
          Host: host,
        },
      },
    )

    const payload = response.data || {}
    if (payload.status === false) {
      const errMsg =
        typeof payload.message === 'string'
          ? payload.message
          : 'Upstream games API returned status=false'
      return res.status(502).json({
        success: false,
        message: errMsg,
      })
    }

    const list = Array.isArray(payload.message)
      ? payload.message
      : Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : []

    const games = list.map(normalizeGame).filter(Boolean)

    return res.json({
      success: true,
      count: games.length,
      data: games,
    })
  } catch (err) {
    const status = err.response?.status || 502
    const detail =
      (typeof err.response?.data?.message === 'string' && err.response.data.message) ||
      err.message ||
      'Failed to fetch games'
    console.error('[GAMES] Fetch failed:', detail)
    return res.status(status >= 400 && status < 600 ? status : 502).json({
      success: false,
      message: detail,
    })
  }
}
