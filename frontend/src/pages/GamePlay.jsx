import { useCallback, useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { launchGame } from '../api'
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
  return [game.id, game.code, game.slug].some(
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
    return slug ? { id: slug, code: slug, name: slug } : null
  })
  const [launchUrl, setLaunchUrl] = useState('')
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState('')
  const [frameLoaded, setFrameLoaded] = useState(false)

  useEffect(() => {
    const fromState = location.state?.game
    if (fromState) {
      saveStoredGame(fromState)
      setGame(fromState)
      return
    }
    const stored = readStoredGame()
    if (stored && (!slug || matchesSlug(stored, slug))) {
      setGame(stored)
    } else if (slug) {
      setGame({ id: slug, code: slug, name: slug })
    } else {
      setGame(null)
    }
  }, [slug, location.state])

  const gid = String(game?.id || game?.code || slug || '').trim()

  const startSession = useCallback(async () => {
    if (!gid) return
    setLaunching(true)
    setLaunchError('')
    setLaunchUrl('')
    setFrameLoaded(false)
    try {
      const res = await launchGame(gid, {
        closeUrl: typeof window !== 'undefined' ? window.location.origin : '',
      })
      const url = res.data?.launchUrl || ''
      if (!url) throw new Error('Launch URL was not returned by server')
      setLaunchUrl(url)
    } catch (err) {
      setLaunchError(err.message || 'Failed to launch game')
    } finally {
      setLaunching(false)
    }
  }, [gid])

  useEffect(() => {
    if (authLoading || !user || !gid) return
    startSession()
  }, [authLoading, user, gid, startSession])

  useEffect(() => {
    if (!user) return undefined
    return () => {
      refreshBalance().catch(() => {})
    }
  }, [user, refreshBalance])

  if (authLoading) {
    return (
      <div className="game-play-shell">
        <div className="game-play-loader">
          <div className="game-play-spinner" />
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!gid) {
    return <Navigate to="/" replace />
  }

  const displayName = game?.name || gid

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
          aria-label={`Back to lobby from ${displayName}`}
        >
          <span className="game-strip-chevron">
            <IconChevronLeft />
          </span>
          <span className="game-strip-title">{displayName}</span>
        </button>

        <div className="game-strip-user" title={user.username || 'Player'}>
          <span className="game-strip-username">{user.username || 'Player'}</span>
          <span className="game-strip-avatar" aria-hidden="true">
            <IconUserCircle />
          </span>
        </div>
      </header>

      <main className="game-stage">
        {launchError ? (
          <div className="game-stage-error" role="alert">
            <p>{launchError}</p>
            <div className="game-stage-actions">
              <button
                type="button"
                className="btn-game btn-play"
                onClick={startSession}
              >
                Retry
              </button>
              <button
                type="button"
                className="btn-game btn-purple"
                onClick={handleBack}
              >
                Back to Lobby
              </button>
            </div>
          </div>
        ) : (
          <>
            {launching || !frameLoaded ? (
              <div className="game-stage-loading" aria-live="polite">
                <div className="game-play-spinner" />
              </div>
            ) : null}
            {launchUrl ? (
              <iframe
                src={launchUrl}
                title={displayName}
                className="game-iframe"
                allow="autoplay; fullscreen; clipboard-read; clipboard-write"
                allowFullScreen
                onLoad={() => setFrameLoaded(true)}
              />
            ) : null}
          </>
        )}
      </main>
    </div>
  )
}
