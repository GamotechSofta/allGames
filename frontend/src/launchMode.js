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

/**
 * Return URL for external games. Empty on localhost to avoid Chrome PNA blocks
 * if the game navigates the top window.
 */
export function safeGameReturnUrl() {
  try {
    if (isPrivateNetworkHost(window.location.hostname)) return ''
    return `${window.location.origin}/?tab=games`
  } catch {
    return ''
  }
}
