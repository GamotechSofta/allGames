import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { fetchEnabledGames } from '../api'
import './GamePlay.css'

const PLAY_STORAGE_KEY = 'allgames_active_game'

function IconChevronLeft() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function IconUserCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="8.2" r="4" />
      <path d="M4.5 20.5c.8-4 3.8-6.2 7.5-6.2s6.7 2.2 7.5 6.2" />
    </svg>
  )
}

function readStoredGame() {
  try {
    const raw = sessionStorage.getItem(PLAY_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveStoredGame(game) {
  try {
    if (game) sessionStorage.setItem(PLAY_STORAGE_KEY, JSON.stringify(game))
    else sessionStorage.removeItem(PLAY_STORAGE_KEY)
  } catch {
    /* ignore storage failures */
  }
}

function matchesSlug(game, slug) {
  if (!game || !slug) return false
  const target = String(slug).toLowerCase()
  return [game.slug, game.code, game.id].some(
    (v) => v && String(v).toLowerCase() === target,
  )
}

export default function GamePlay() {
  const { slug } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading: authLoading, refreshBalance } = useAuth()

  const [game, setGame] = useState(() => {
    const fromState = location.state?.game
    if (fromState) {
      saveStoredGame(fromState)
      return fromState
    }
    const stored = readStoredGame()
    if (stored && (!slug || matchesSlug(stored, slug))) {
      return stored
    }
    return null
  })
  const [resolving, setResolving] = useState(() => !game && Boolean(slug))
  const [frameLoaded, setFrameLoaded] = useState(false)

  useEffect(() => {
    const fromState = location.state?.game
    if (fromState) {
      saveStoredGame(fromState)
      setGame(fromState)
      setResolving(false)
      setFrameLoaded(false)
      return
    }
    if (game && (!slug || matchesSlug(game, slug))) return
    if (!slug) {
      setResolving(false)
      return
    }

    let cancelled = false
    setResolving(true)
    fetchEnabledGames()
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res.data) ? res.data : []
        const found = list.find((item) => matchesSlug(item, slug)) || null
        if (found) saveStoredGame(found)
        setGame(found)
      })
      .catch(() => {
        if (!cancelled) setGame(null)
      })
      .finally(() => {
        if (!cancelled) setResolving(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug, location.state, game])

  useEffect(() => {
    if (!user) return undefined
    return () => {
      refreshBalance().catch(() => {})
    }
  }, [user, refreshBalance])

  if (authLoading || resolving) {
    return (
      <div className="game-play-shell">
        <div className="game-play-loader">
          <div className="game-play-spinner" />
          <p>Loading game…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const launchUrl = !game?.maintenanceMode ? game?.launchUrl || game?.demoUrl || '' : ''

  if (!game || !launchUrl) {
    return <Navigate to="/" replace />
  }

  function handleBack() {
    refreshBalance().catch(() => {})
    navigate('/', { replace: false, state: { tab: 'lobby' } })
  }

  return (
    <div className="game-play-shell">
      <header className="game-strip">
        <button
          type="button"
          className="game-strip-back"
          onClick={handleBack}
          aria-label={`Back to lobby from ${game.name}`}
        >
          <span className="game-strip-chevron">
            <IconChevronLeft />
          </span>
          <span className="game-strip-title">{game.name}</span>
        </button>

        <div className="game-strip-user" title={user.username || 'Player'}>
          <span className="game-strip-username">{user.username || 'Player'}</span>
          <span className="game-strip-avatar" aria-hidden="true">
            <IconUserCircle />
          </span>
        </div>
      </header>

      <main className="game-stage">
        {!frameLoaded ? (
          <div className="game-stage-loading" aria-live="polite">
            <div className="game-play-spinner" />
          </div>
        ) : null}
        <iframe
          src={launchUrl}
          title={game.name}
          className="game-iframe"
          allow="autoplay; fullscreen; clipboard-read; clipboard-write"
          allowFullScreen
          onLoad={() => setFrameLoaded(true)}
        />
      </main>
    </div>
  )
}
