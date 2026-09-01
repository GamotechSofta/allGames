import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { fetchGames, fetchGameHistory, launchGame } from '../api'
import siteLogo from '../assets/image.png'

/** Public CDN images (Unsplash / Wikimedia) for lobby art */
const IMAGES = {
  teenpatti: 'https://images.unsplash.com/photo-1541278107931-e006523892df?auto=format&fit=crop&w=900&q=80',
  ludo: 'https://store-images.s-microsoft.com/image/apps.38011.13964317340864868.4c21ecf1-2804-40c6-bd9e-a2efd241f30b.7fb161ca-d8f2-4e3a-9f2b-4992fa436cd1?q=90&w=480&h=270',
  defaultGame: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80',
}

function shortId(id) {
  const s = String(id || '')
  if (s.length <= 10) return s
  return `${s.slice(0, 6)}…${s.slice(-4)}`
}

function formatWhen(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function badgeClass(kind) {
  const k = String(kind || '').toUpperCase()
  if (k === 'LAUNCH') return 'launch'
  if (k === 'BET' || k === 'DEBIT') return 'bet'
  if (k === 'WIN' || k === 'CREDIT') return 'win'
  return 'tx'
}

function gameImage(game) {
  if (game?.image) return game.image
  const key = String(game?.gameId || game?.title || game?.name || '').toLowerCase()
  if (key.includes('teen') || key.includes('patti')) return IMAGES.teenpatti
  if (key.includes('ludo')) return IMAGES.ludo
  return IMAGES.defaultGame
}

function gameTag(game, index) {
  const key = String(game?.gameId || '').toLowerCase()
  if (key.includes('teen') || key.includes('patti') || index === 0) {
    return { label: 'HOT', className: 'tag-hot' }
  }
  return { label: 'LIVE', className: 'tag-new' }
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  )
}

function IconGames() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function IconHistory() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12a8 8 0 1 0 2.3-5.7" />
      <path d="M4 5v4h4" />
      <path d="M12 8v5l3 2" />
    </svg>
  )
}

function IconProfile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.5-3.2 4-4.5 7-4.5s5.5 1.3 7 4.5" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 7V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-2" />
      <path d="M15 12H3m0 0 3-3m-3 3 3 3" />
    </svg>
  )
}

function IconCoin() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7.5v9M9.5 10.5c.6-1 1.5-1.5 2.5-1.5s2 .6 2.2 1.6c.2 1.1-.6 1.7-2.2 2.1-1.6.4-2.5 1-2.3 2.1.2 1 1.1 1.6 2.3 1.6s1.9-.5 2.5-1.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7h18" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M5 12h14" stroke="url(#menuGlow)" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M3 17h18" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <defs>
        <linearGradient id="menuGlow" x1="5" y1="12" x2="19" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffe08a" />
          <stop offset="1" stopColor="#39ff8a" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

const NAV = [
  { id: 'lobby', label: 'Lobby', Icon: IconHome },
  { id: 'games', label: 'Games', Icon: IconGames },
  { id: 'history', label: 'History', Icon: IconHistory },
  { id: 'wallet', label: 'Profile', Icon: IconProfile },
]

export default function Home() {
  const { user, loading, logout, refreshBalance } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState(() => {
    const fromState = location.state?.tab
    const fromQuery = new URLSearchParams(window.location.search).get('tab')
    const fromStore = sessionStorage.getItem('allgames_tab')
    const allowed = ['lobby', 'games', 'history', 'wallet']
    if (allowed.includes(fromState)) return fromState
    if (allowed.includes(fromQuery)) return fromQuery
    if (allowed.includes(fromStore)) return fromStore
    return 'lobby'
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [games, setGames] = useState([])
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState('')
  const [launching, setLaunching] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const userId = user?.id || user?.playerId

  useEffect(() => {
    sessionStorage.setItem('allgames_tab', tab)
  }, [tab])

  // Restore Games tab when returning from play / external returnUrl
  useEffect(() => {
    const applyReturnTab = () => {
      const fromQuery = new URLSearchParams(window.location.search).get('tab')
      const fromStore = sessionStorage.getItem('allgames_tab')
      if (fromQuery === 'games' || fromStore === 'games') {
        setTab('games')
      }
      refreshBalance().catch(() => {})
    }

    applyReturnTab()
    window.addEventListener('pageshow', applyReturnTab)
    window.addEventListener('focus', applyReturnTab)
    return () => {
      window.removeEventListener('pageshow', applyReturnTab)
      window.removeEventListener('focus', applyReturnTab)
    }
  }, [refreshBalance])

  useEffect(() => {
    const fromState = location.state?.tab
    const fromQuery = searchParams.get('tab')
    const allowed = ['lobby', 'games', 'history', 'wallet']
    if (allowed.includes(fromState)) {
      setTab(fromState)
      navigate(location.pathname, { replace: true, state: {} })
      return
    }
    if (allowed.includes(fromQuery)) {
      setTab(fromQuery)
      const next = new URLSearchParams(searchParams)
      next.delete('tab')
      setSearchParams(next, { replace: true })
    }
  }, [location.state, location.pathname, searchParams, navigate, setSearchParams])

  const moneyHistory = useMemo(
    () =>
      history.filter((row) => {
        const kind = String(row.kind || row.type || '').toUpperCase()
        return kind === 'CREDIT' || kind === 'DEBIT' || kind === 'BET' || kind === 'WIN'
      }),
    [history],
  )

  const gameHistory = useMemo(() => history, [history])

  const recent = useMemo(() => moneyHistory.slice(0, 4), [moneyHistory])

  useEffect(() => {
    if (!userId) return
    fetchGames()
      .then((res) => setGames(res.data || []))
      .catch((err) => setError(err.message))
    refreshBalance().catch(() => {})
    fetchGameHistory(40)
      .then((res) => setHistory(res.data?.feed || res.data?.transactions || []))
      .catch(() => {})
  }, [userId, refreshBalance])

  useEffect(() => {
    if (!userId || tab !== 'history') return
    let cancelled = false
    setHistoryLoading(true)
    fetchGameHistory(60)
      .then((res) => {
        if (!cancelled) setHistory(res.data?.feed || res.data?.transactions || [])
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load history')
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, tab])

  useEffect(() => {
    if (!userId) return undefined
    const onFocus = () => {
      refreshBalance().catch(() => {})
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') onFocus()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, refreshBalance])

  useEffect(() => {
    if (!menuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[var(--bg)]">
        <p className="font-display text-sm tracking-[0.2em] text-[var(--muted)]">LOADING LOBBY…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  async function onRefresh() {
    setRefreshing(true)
    setError('')
    try {
      await refreshBalance()
      const [gamesRes, historyRes] = await Promise.all([fetchGames(), fetchGameHistory(60)])
      setGames(gamesRes.data || [])
      setHistory(historyRes.data?.feed || historyRes.data?.transactions || [])
    } catch (err) {
      setError(err.message || 'Refresh failed')
    } finally {
      setRefreshing(false)
    }
  }

  async function onPlay(game) {
    if (launching) return
    const gameId = game.gameId || game.gameCode
    setError('')
    setLaunching(gameId)
    try {
      await refreshBalance()
      const res = await launchGame(gameId)
      const url = res.launchUrl
      if (!url) throw new Error('Launch URL missing from response')
      sessionStorage.setItem('allgames_tab', 'games')
      setTab('games')

      const playSession = {
        launchUrl: url,
        gameName: game.title || game.name || gameId,
        sessionId: res.sessionId || '',
        returnTab: 'games',
        openMode: 'iframe',
        provider: res.provider || game.provider || '',
      }
      try {
        sessionStorage.setItem('allgames_play_session', JSON.stringify(playSession))
      } catch {
        /* ignore */
      }
      navigate('/play', { state: playSession })
      setLaunching('')
    } catch (err) {
      setError(err.message || 'Could not launch game')
      setLaunching('')
    }
  }

  const showLobby = tab === 'lobby'
  const showGamesOnly = tab === 'games'
  const showHistory = tab === 'history'
  const showWallet = tab === 'wallet'

  function renderGameCards() {
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {games.map((game, index) => {
            const id = game.gameId
            const busy = launching === id
            const title = game.title || game.name || id
            const tag = gameTag(game, index)
            return (
              <article key={game._id || id} className="game-card">
                <div className="game-card-art">
                  <img src={gameImage(game)} alt="" />
                  <span className={`tag ${tag.className}`}>{tag.label}</span>
                  <div className="absolute bottom-3 left-3 z-[1]">
                    <h4 className="font-display text-xl font-extrabold tracking-wide drop-shadow">
                      {title}
                    </h4>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-1">
                  <button
                    type="button"
                    disabled={Boolean(launching)}
                    onClick={() => onPlay(game)}
                    className="btn-game btn-play w-full py-2.5 text-[0.7rem]"
                  >
                    {busy ? 'Launching…' : 'Play Now'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>

        {!games.length && !error ? (
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center">
            <p className="font-display text-sm tracking-[0.2em] text-[var(--muted)]">
              NO ACTIVE GAMES
            </p>
          </div>
        ) : null}
      </>
    )
  }

  function selectTab(id) {
    setError('')
    setTab(id)
    setMenuOpen(false)
  }

  return (
    <div className={`dash text-[var(--text)] ${menuOpen ? 'menu-open' : ''}`}>
      <button
        type="button"
        className="nav-backdrop"
        aria-label="Close menu"
        onClick={() => setMenuOpen(false)}
      />

      <aside className="dash-sidebar">
        <div className="dash-brand">
          <img src={siteLogo} alt="AllGames" className="site-logo" />
          <div>
            <p className="dash-brand-title">ALLGAMES</p>
            <p className="text-xs font-semibold tracking-wide text-[var(--muted)]">Player Lobby</p>
          </div>
          <button
            type="button"
            className="menu-close-btn"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <IconClose />
          </button>
        </div>

        <nav className="nav-list" aria-label="Main">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`nav-item ${tab === id ? 'is-active' : ''}`}
              onClick={() => selectTab(id)}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-wallet">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
              Your wallet
            </p>
            <p className="font-display mt-1 text-xl font-bold tracking-wide text-[var(--gold)]">
              ₹{Number(user.balance ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
              Points ready to play
            </p>
            <button
              type="button"
              className="btn-game btn-purple mt-3 w-full py-2 text-[0.62rem]"
              onClick={() => selectTab('wallet')}
            >
              View Profile
            </button>
          </div>
          <button
            type="button"
            className="btn-game btn-danger sidebar-logout w-full py-2.5 text-[0.65rem]"
            onClick={() => {
              setMenuOpen(false)
              logout()
            }}
          >
            <IconLogout />
            Logout
          </button>
        </div>
      </aside>

      <div className="dash-content">
        <div className="mobile-topbar">
          <div className="flex items-center gap-2 min-w-0">
            <img src={siteLogo} alt="AllGames" className="site-logo site-logo-sm" />
            <p className="dash-brand-title truncate">ALLGAMES</p>
          </div>
          <div className="mobile-topbar-right">
            <div className="chip chip-compact">
              <span className="chip-icon gold">
                <IconCoin />
              </span>
              <p className="font-display text-sm font-bold tracking-wide text-[var(--gold)]">
                ₹{Number(user.balance ?? 0).toLocaleString('en-IN')}
              </p>
            </div>
            <button
              type="button"
              className="hamburger-btn"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <IconMenu />
              <span>Menu</span>
            </button>
          </div>
        </div>

        <header className="dash-header">
          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            <div className="chip header-wallet-chip">
              <span className="chip-icon gold">
                <IconCoin />
              </span>
              <div className="leading-tight">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                  Wallet
                </p>
                <p className="font-display text-sm font-bold tracking-wide text-[var(--gold)]">
                  ₹{Number(user.balance ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="btn-game btn-purple px-3.5 py-2.5 text-[0.62rem]"
            >
              {refreshing ? '…' : 'Refresh'}
            </button>
          </div>
        </header>

        <div className={`dash-body ${showGamesOnly || showHistory || showWallet ? 'dash-body-single' : ''}`}>
          <section className="min-w-0 space-y-4">
            {error ? (
              <p className="rounded-xl border border-[var(--danger)]/35 bg-[var(--danger)]/10 px-4 py-3 text-sm font-semibold text-[#fecdd3]">
                {error}
              </p>
            ) : null}

            {showLobby ? renderGameCards() : null}

            {showGamesOnly ? renderGameCards() : null}

            {showHistory ? (
              <div>
                <div className="mb-4">
                  <h2 className="font-display text-2xl font-bold tracking-[0.06em]">Game History</h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                    Game launches, bets, and wins from your account
                  </p>
                </div>
                <div className="history-panel">
                  {historyLoading ? (
                    <p className="px-5 py-12 text-center font-display text-sm tracking-[0.18em] text-[var(--muted)]">
                      LOADING HISTORY…
                    </p>
                  ) : !gameHistory.length ? (
                    <div className="px-5 py-14 text-center">
                      <p className="font-display text-sm tracking-[0.2em] text-[var(--muted)]">
                        NO ACTIVITY YET
                      </p>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        Launches and wallet transactions from play will show up here.
                      </p>
                    </div>
                  ) : (
                    gameHistory.map((row) => {
                      const type = String(row.type || row.kind || '').toUpperCase()
                      const isLaunch = type === 'LAUNCH'
                      const isDebit = type === 'DEBIT' || type === 'BET'
                      const isCredit = type === 'CREDIT' || type === 'WIN'
                      const label = isLaunch
                        ? 'PLAY'
                        : isDebit
                          ? 'DEBIT'
                          : isCredit
                            ? 'CREDIT'
                            : type || 'TX'
                      const amount = Math.abs(Number(row.amount) || 0)
                      return (
                        <div key={`${label}-${row.id}`} className="history-row">
                          <span
                            className={`history-badge ${
                              isLaunch ? 'launch' : isDebit ? 'bet' : isCredit ? 'win' : 'tx'
                            }`}
                          >
                            {label}
                          </span>
                          <div className="min-w-0">
                            <p className="font-display truncate text-sm font-bold tracking-wide">
                              {row.gameTitle || row.gameId || 'Wallet'}
                            </p>
                            <p className="mt-0.5 truncate text-xs font-semibold text-[var(--muted)]">
                              {isLaunch
                                ? `Session ${shortId(row.sessionId)}`
                                : shortId(row.transactionId || row.roundId)}
                              {!isLaunch && row.status ? ` · ${row.status}` : ''}
                              {row.rolledBack ? ' · rolled back' : ''}
                            </p>
                          </div>
                          <div className="history-meta text-right">
                            {isLaunch ? (
                              <p className="font-display text-sm font-bold text-[var(--violet)]">
                                Started
                              </p>
                            ) : (
                              <p
                                className={`font-display text-sm font-bold ${
                                  isDebit ? 'text-[#fda4af]' : 'text-[var(--lime)]'
                                }`}
                              >
                                {isDebit ? '−' : '+'}₹{amount.toLocaleString('en-IN')}
                              </p>
                            )}
                            <p className="mt-0.5 text-xs text-[var(--muted)]">
                              {formatWhen(row.createdAt)}
                            </p>
                            {!isLaunch && typeof row.balanceAfter === 'number' ? (
                              <p className="text-[0.65rem] text-[var(--muted)]">
                                Bal ₹{Number(row.balanceAfter).toLocaleString('en-IN')}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ) : null}

            {showWallet ? (
              <div className="profile-page">
                <div className="profile-hero">
                  <div className="profile-hero-bg" />
                  <div className="profile-hero-body">
                    <img src={siteLogo} alt="" className="profile-avatar" />
                    <div className="min-w-0">
                      <p className="font-display text-[0.65rem] font-bold tracking-[0.22em] text-[var(--lime)]">
                        PLAYER PROFILE
                      </p>
                      <h2 className="font-display mt-1 truncate text-2xl font-extrabold tracking-wide sm:text-3xl">
                        {user.username || 'Player'}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                        {user.phone ? `+91 ${user.phone}` : 'Phone not set'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onRefresh}
                      disabled={refreshing}
                      className="btn-game btn-purple ml-auto px-4 py-2.5 text-[0.62rem]"
                    >
                      {refreshing ? '…' : 'Refresh'}
                    </button>
                  </div>
                </div>

                <div className="profile-stats">
                  <div className="profile-stat">
                    <span className="profile-stat-label">Wallet balance</span>
                    <span className="profile-stat-value gold">
                      ₹{Number(user.balance ?? 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="profile-stat">
                    <span className="profile-stat-label">Games played</span>
                    <span className="profile-stat-value">
                      {new Set(gameHistory.filter((h) => (h.type || h.kind) === 'LAUNCH').map((h) => h.gameId).filter(Boolean)).size}
                    </span>
                  </div>
                  <div className="profile-stat">
                    <span className="profile-stat-label">Activity</span>
                    <span className="profile-stat-value">{gameHistory.length}</span>
                  </div>
                </div>

                <div className="profile-grid">
                  <div className="side-card profile-details">
                    <p className="font-display text-[0.65rem] font-bold tracking-[0.16em] text-[var(--violet)]">
                      ACCOUNT DETAILS
                    </p>
                    <dl className="profile-fields">
                      <div>
                        <dt>Display name</dt>
                        <dd>{user.username || '—'}</dd>
                      </div>
                      <div>
                        <dt>Phone</dt>
                        <dd>{user.phone || '—'}</dd>
                      </div>
                      <div>
                        <dt>Currency</dt>
                        <dd>INR</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd className="text-[var(--lime)]">Active</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="side-card">
                    <p className="font-display text-[0.65rem] font-bold tracking-[0.16em] text-[var(--gold)]">
                      QUICK ACTIONS
                    </p>
                    <div className="mt-4 flex flex-col gap-2.5">
                      <button
                        type="button"
                        className="btn-game btn-play w-full py-2.5 text-[0.65rem]"
                        onClick={() => selectTab('games')}
                      >
                        Play Games
                      </button>
                      <button
                        type="button"
                        className="btn-game btn-purple w-full py-2.5 text-[0.65rem]"
                        onClick={() => selectTab('history')}
                      >
                        View History
                      </button>
                      <button
                        type="button"
                        className="btn-game btn-danger w-full py-2.5 text-[0.65rem]"
                        onClick={logout}
                      >
                        <IconLogout />
                        Logout
                      </button>
                    </div>
                  </div>
                </div>

                <div className="side-card">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-display text-[0.65rem] font-bold tracking-[0.16em] text-[var(--violet)]">
                      RECENT ACTIVITY
                    </p>
                    <button
                      type="button"
                      className="text-xs font-bold text-[var(--lime)] hover:underline"
                      onClick={() => selectTab('history')}
                    >
                      See all
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {recent.length ? (
                      recent.slice(0, 3).map((row) => {
                        const type = String(row.type || row.kind || '').toUpperCase()
                        const isDebit = type === 'DEBIT' || type === 'BET'
                        return (
                        <div
                          key={`profile-${row.kind}-${row.id}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">
                              {isDebit ? 'DEBIT' : 'CREDIT'} · {row.gameTitle || row.gameId || 'Wallet'}
                            </p>
                            <p className="text-xs text-[var(--muted)]">{formatWhen(row.createdAt)}</p>
                          </div>
                          <p
                            className={`shrink-0 font-display text-sm font-bold ${
                              isDebit ? 'text-[#fda4af]' : 'text-[var(--lime)]'
                            }`}
                          >
                            {isDebit ? '−' : '+'}₹
                            {Math.abs(Number(row.amount) || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        )
                      })
                    ) : (
                      <p className="text-sm font-semibold text-[var(--muted)]">No activity yet</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {showLobby ? (
            <aside className="space-y-3">
              <div className="side-card">
                <p className="font-display text-[0.65rem] font-bold tracking-[0.16em] text-[var(--violet)]">
                  RECENT ACTIVITY
                </p>
                <div className="mt-3 space-y-2.5">
                  {recent.length ? (
                    recent.map((row) => {
                      const type = String(row.type || row.kind || '').toUpperCase()
                      const label =
                        type === 'DEBIT' || type === 'BET'
                          ? 'DEBIT'
                          : type === 'CREDIT' || type === 'WIN'
                            ? 'CREDIT'
                            : type
                      return (
                      <button
                        key={`side-${row.kind}-${row.id}`}
                        type="button"
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-2.5 py-2 text-left hover:border-[var(--purple)]/40"
                        onClick={() => setTab('history')}
                      >
                        <span className="truncate text-xs font-bold">
                          {label} · {row.gameTitle || row.gameId || 'Wallet'}
                        </span>
                        <span className="shrink-0 text-[0.65rem] text-[var(--muted)]">
                          {formatWhen(row.createdAt)}
                        </span>
                      </button>
                      )
                    })
                  ) : (
                    <p className="text-xs font-semibold text-[var(--muted)]">No activity yet</p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-game btn-purple mt-3 w-full py-2.5 text-[0.62rem]"
                  onClick={() => setTab('history')}
                >
                  Full History
                </button>
              </div>

              <div className="side-card">
                <p className="font-display text-[0.65rem] font-bold tracking-[0.16em] text-[var(--gold)]">
                  WALLET
                </p>
                <p className="font-display mt-2 text-2xl font-extrabold text-[var(--gold)]">
                  ₹{Number(user.balance ?? 0).toLocaleString('en-IN')}
                </p>
                <button
                  type="button"
                  className="btn-game btn-purple mt-3 w-full py-2.5 text-[0.62rem]"
                  onClick={() => setTab('wallet')}
                >
                  Open Profile
                </button>
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  )
}
