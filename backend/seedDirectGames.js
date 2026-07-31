import { Game } from './models/game.model.js'

const DIRECT_GAMES = [
  {
    name: 'Ludo',
    title: 'Ludo',
    gameId: 'LUDO',
    provider: 'DIRECT',
    status: 'active',
    isActive: true,
    image: '',
  },
  {
    name: 'Teen Patti',
    title: 'Teen Patti',
    gameId: 'TEENPATTI',
    provider: 'DIRECT',
    status: 'active',
    isActive: true,
    image: '',
  },
]

/** Ensure Ludo + Teen Patti exist in the catalog (no launchUrl stored). */
export async function seedDirectGames() {
  for (const game of DIRECT_GAMES) {
    await Game.findOneAndUpdate(
      { gameId: game.gameId },
      { $set: game },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    )
  }
  console.log('[seed] Ludo + Teen Patti catalog games ready')
}

export function isDirectLaunchGame(gameId, provider) {
  const id = String(gameId || '').trim().toUpperCase()
  const p = String(provider || '').trim().toUpperCase()
  if (p === 'DIRECT') return true
  return id === 'LUDO' || id === 'TEENPATTI' || id === 'TEEN_PATTI'
}
