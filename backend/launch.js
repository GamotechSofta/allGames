function joinUrl(base, params) {
  const url = new URL(base)
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

/**
 * PotLudo (fashionbuddies) only reads:
 *   id       = operator JWT (our player token)
 *   game_id  = numeric operator game id
 *
 * Teen Patti uses similar operator-style params.
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

  if (code === 'LUDO') {
    const base =
      process.env.LUDO_LAUNCH_BASE_URL ||
      'https://www.fashionbuddies.in/play/online'
    const gameId = process.env.LUDO_OPERATOR_GAME_ID || '1'
    // PotLudo online mode: POST /api/v1/identity/operator/session { id, gameId }
    return joinUrl(base, {
      id: token,
      game_id: gameId,
      gameId,
      userId: playerId,
      operatorId,
      balance: String(balance ?? 0),
      username: username || phone || playerId,
      returnUrl: returnUrl || process.env.FRONTEND_URL || '',
    })
  }

  if (code === 'TEENPATTI' || code === 'TEEN_PATTI') {
    const base = process.env.TEENPATTI_LAUNCH_BASE_URL
    if (!base) throw new Error('TEENPATTI_LAUNCH_BASE_URL is not configured')
    const operatorGameId = process.env.TEENPATTI_OPERATOR_GAME_ID || '2'
    const catalogGameId = process.env.TEENPATTI_CATALOG_GAME_ID || 'teenpatti'
    return joinUrl(base, {
      id: token,
      token,
      userId: playerId,
      playerId,
      operatorId,
      operator_id: operatorId,
      gameId: operatorGameId,
      game_id: operatorGameId,
      catalogGameId,
      catalog_game_id: catalogGameId,
      balance: String(balance ?? 0),
      username: username || phone || playerId,
      returnUrl: returnUrl || process.env.FRONTEND_URL || '',
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
