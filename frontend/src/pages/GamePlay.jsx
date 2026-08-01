import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

const PLAY_KEY = 'allgames_play_session'
const TAB_KEY = 'allgames_tab'

const SESSION_EXPIRED_RE =
  /login|session[_-]?expired|token[_-]?expired|unauthorized|\/401\b/i

function readPlaySession(locationState) {
  if (locationState?.launchUrl) {
    const session = {
      launchUrl: locationState.launchUrl,
      gameName: locationState.gameName || 'Game',
      sessionId: locationState.sessionId || '',
      returnTab: locationState.returnTab || 'games',
    }
    try {
      sessionStorage.setItem(PLAY_KEY, JSON.stringify(session))
    } catch {
      /* ignore */
    }
    return session
  }
  try {
    const raw = sessionStorage.getItem(PLAY_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearPlaySession() {
  try {
    sessionStorage.removeItem(PLAY_KEY)
  } catch {
    /* ignore */
  }
}

function viewportSize() {
  const vv = window.visualViewport
  return {
    width: Math.max(1, Math.floor(vv?.width ?? window.innerWidth)),
    height: Math.max(1, Math.floor(vv?.height ?? window.innerHeight)),
  }
}

export default function GamePlay() {
  const { user, logout, refreshBalance } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const iframeRef = useRef(null)
  const exitingRef = useRef(false)
  const [session] = useState(() => readPlaySession(location.state))
  const [size, setSize] = useState(() => viewportSize())

  const launchUrl = session?.launchUrl || ''
  const gameName = session?.gameName || 'Game'
  const returnTab = session?.returnTab || 'games'
  const canPlay = Boolean(user && launchUrl)

  const exitToGames = useCallback(() => {
    if (exitingRef.current) return
    exitingRef.current = true
    clearPlaySession()
    try {
      sessionStorage.setItem(TAB_KEY, returnTab)
    } catch {
      /* ignore */
    }
    refreshBalance().catch(() => {})
    // Replace play route so Back won't reopen a dead play screen
    navigate('/', { replace: true, state: { tab: returnTab } })
  }, [navigate, refreshBalance, returnTab])

  const forceRelogin = useCallback(() => {
    clearPlaySession()
    logout()
    navigate('/login', { replace: true, state: { reason: 'session_expired' } })
  }, [logout, navigate])

  useEffect(() => {
    if (!launchUrl) return
    if (SESSION_EXPIRED_RE.test(launchUrl)) forceRelogin()
  }, [launchUrl, forceRelogin])

  useEffect(() => {
    try {
      sessionStorage.setItem(TAB_KEY, returnTab)
    } catch {
      /* ignore */
    }
  }, [returnTab])

  /*
   * Iframe navigations steal browser Back (joint session history).
   * Push a parent history guard after every iframe load so the next Back
   * hits our popstate handler and returns to the Games dashboard.
   */
  useEffect(() => {
    if (!canPlay) return undefined

    const pushGuard = () => {
      try {
        window.history.pushState({ allgamesPlayGuard: Date.now() }, '', '/play')
      } catch {
        /* ignore */
      }
    }

    pushGuard()

    const onPopState = () => {
      exitToGames()
    }

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        exitToGames()
      }
    }

    window.addEventListener('popstate', onPopState)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [canPlay, exitToGames])

  function onIframeLoad() {
    // Re-arm guard above any iframe-internal navigations
    try {
      window.history.pushState({ allgamesPlayGuard: Date.now() }, '', '/play')
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    const sync = () => setSize(viewportSize())
    sync()

    const vv = window.visualViewport
    vv?.addEventListener('resize', sync)
    vv?.addEventListener('scroll', sync)
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)

    const html = document.documentElement
    const body = document.body
    const root = document.getElementById('root')
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyMargin: body.style.margin,
      rootHeight: root?.style.height || '',
      rootOverflow: root?.style.overflow || '',
    }

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.margin = '0'
    if (root) {
      root.style.height = '100%'
      root.style.overflow = 'hidden'
    }

    return () => {
      vv?.removeEventListener('resize', sync)
      vv?.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
      body.style.margin = prev.bodyMargin
      if (root) {
        root.style.height = prev.rootHeight
        root.style.overflow = prev.rootOverflow
      }
    }
  }, [])

  if (!user) return <Navigate to="/login" replace />
  if (!canPlay) return <Navigate to="/" replace state={{ tab: 'games' }} />

  return (
    <div
      className="game-iframe-shell"
      style={{ width: size.width, height: size.height }}
    >
      <button
        type="button"
        className="game-exit-btn"
        aria-label="Back to games"
        title="Back to games (Esc)"
        onClick={exitToGames}
      >
        ×
      </button>

      <iframe
        ref={iframeRef}
        title={gameName}
        src={launchUrl}
        className="game-iframe"
        width={size.width}
        height={size.height}
        style={{ width: size.width, height: size.height }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals allow-pointer-lock"
        allow="autoplay; fullscreen; payment; clipboard-read; clipboard-write; accelerometer; gyroscope"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={onIframeLoad}
      />
    </div>
  )
}
