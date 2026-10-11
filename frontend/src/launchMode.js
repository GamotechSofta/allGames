/** All catalog games open in the same-tab /play iframe. */

export function shouldOpenTopLevel() {
  return false
}

/** Chrome blocks public sites navigating back to localhost / private IPs. */
export function isPrivateNetworkHost(hostname) {
  const h = String(hostname || '').toLowerCase()
  if (!h || h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1') {
    return true
  }
  if (/^10\.\d+\.\d+\.\d+$/.test(h)) return true
  if (/^192\.168\.\d+\.\d+$/.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(h)) return true
  return false
}

export const PROVIDER_HOME_URL = 'https://www.123games.fun/'

/**
 * Return URL for external games. Fallback to https://www.123games.fun/
 * so the user can go back to the 123Games home page.
 */
export function safeGameReturnUrl() {
  try {
    if (isPrivateNetworkHost(window.location.hostname)) return PROVIDER_HOME_URL
    return `${window.location.origin}/?tab=games`
  } catch {
    return PROVIDER_HOME_URL
  }
}
