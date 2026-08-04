/**
 * @deprecated Game launch URLs come from the admin catalog (Game.launchUrl).
 * Kept empty so old imports do not break.
 */
export function buildLaunchUrl() {
  throw new Error('Use Game.launchUrl from the admin panel — env-based launch is removed')
}

export const CATALOG = []
