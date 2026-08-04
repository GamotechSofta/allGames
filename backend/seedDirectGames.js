/**
 * Legacy helpers kept for reference. Game catalog is managed only via Admin panel.
 * Launch URLs must be set on each Game document (launchUrl).
 */

export async function seedDirectGames() {
  console.log('[seed] skipped — add games from Admin → Games')
}

export function isDirectLaunchGame() {
  return false
}
