function encode(value) {
  return encodeURIComponent(value == null ? '' : String(value))
}

function joinUrl(base, params) {
  const url = new URL(base)
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

/**
 * Build launch URLs with player identity + wallet context.
 * Games (Ludo / Teen Patti) receive userId, token, balance, operatorId, etc.
 */
export function buildLaunchUrl(gameCode, ctx) {
  const {
    playerId,
    token,
    balance,
    username,
    phone,
    returnUrl,
  } = ctx

  const operatorId = process.env.APP_OPERATOR_ID || '1'
  const code = String(gameCode || '').toUpperCase()

  const shared = {
    userId: playerId,
    player_id: playerId,
    playerId,
    operatorId,
    operator_id: operatorId,
    token,
    id: token,
    balance: String(balance ?? 0),
    username: username || phone || playerId,
    name: username || phone || playerId,
    currency: 'INR',
    returnUrl: returnUrl || process.env.FRONTEND_URL || '',
  }

  if (code === 'LUDO') {
    const base = process.env.LUDO_LAUNCH_BASE_URL
    if (!base) throw new Error('LUDO_LAUNCH_BASE_URL is not configured')
    return joinUrl(base, {
      ...shared,
      gameId: 'LUDO',
      game_id: 'LUDO',
    })
  }

  if (code === 'TEENPATTI' || code === 'TEEN_PATTI') {
    const base = process.env.TEENPATTI_LAUNCH_BASE_URL
    if (!base) throw new Error('TEENPATTI_LAUNCH_BASE_URL is not configured')
    const operatorGameId = process.env.TEENPATTI_OPERATOR_GAME_ID || '2'
    const catalogGameId = process.env.TEENPATTI_CATALOG_GAME_ID || 'teenpatti'
    return joinUrl(base, {
      ...shared,
      gameId: operatorGameId,
      game_id: operatorGameId,
      catalogGameId,
      catalog_game_id: catalogGameId,
    })
  }

  throw new Error(`Unknown game: ${gameCode}`)
}

export const CATALOG = [
  {
    gameCode: 'LUDO',
    name: 'Ludo',
    description: 'Play online Ludo with your wallet balance',
  },
  {
    gameCode: 'TEENPATTI',
    name: 'Teen Patti',
    description: 'Play Teen Patti with your wallet balance',
  },
]

// keep encode available for tests / debugging
export { encode }
