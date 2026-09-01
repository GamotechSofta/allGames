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

function userInitials(name) {
  const parts = String(name || 'Player').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return String(name || 'PL').slice(0, 2).toUpperCase()
}

function badgeClass(kind) {
  const k = String(kind || '').toUpperCase()
  if (k === 'LAUNCH') return 'launch'
  if (k === 'BET' || k === 'DEBIT') return 'bet'
  if (k === 'WIN' || k === 'CREDIT') return 'win'
  return 'tx'
}

function historyKind(row) {
  return String(row?.type || row?.kind || '').toUpperCase()
}

function isLaunchHistoryRow(row) {
  return historyKind(row) === 'LAUNCH'
}

function isWalletHistoryRow(row) {
  const k = historyKind(row)
  return k === 'CREDIT' || k === 'DEBIT' || k === 'BET' || k === 'WIN'
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="1em" height="1em">
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
  { id: 'lobby', label: 'Home', Icon: IconHome },
  { id: 'games', label: 'All Games', Icon: IconGames },
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
  const [historyView, setHistoryView] = useState('game')
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
    () => history.filter(isWalletHistoryRow),
    [history],
  )

  const gameHistory = useMemo(() => history.filter(isLaunchHistoryRow), [history])

  const visibleHistory = historyView === 'game' ? gameHistory : moneyHistory

  const recent = useMemo(() => moneyHistory.slice(0, 4), [moneyHistory])
  const recentActivity = useMemo(() => gameHistory.slice(0, 5), [gameHistory])

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
        <div className="game-grid grid grid-cols-2 gap-3 sm:gap-4">
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
        <button
          type="button"
          className="menu-close-btn"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        >
          <IconClose />
        </button>

        <nav className="nav-list" aria-label="Main">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`nav-item ${tab === id ? 'is-active' : ''}`}
              onClick={() => selectTab(id)}
            >
              <Icon />
              <span className="nav-item-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-divider" />

          <div className="sidebar-utility-card sidebar-wallet-card">
            <div className="sidebar-wallet-row">
              <span className="sidebar-wallet-icon">
                <IconCoin />
              </span>
              <div className="min-w-0">
                <p className="sidebar-utility-label">Wallet balance</p>
                <p className="sidebar-wallet-amount">
                  ₹{Number(user.balance ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="sidebar-utility-action"
              onClick={() => selectTab('wallet')}
            >
              View Profile
            </button>
          </div>

          <button
            type="button"
            className="sidebar-support-btn"
            onClick={() => {
              setMenuOpen(false)
              logout()
            }}
          >
            <span className="sidebar-support-left">
              <IconLogout />
              <span>Logout</span>
            </span>
            <span className="sidebar-badge">Exit</span>
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
              className="btn-game btn-purple header-refresh-btn px-3.5 py-2.5 text-[0.62rem]"
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
                  <h2 className="font-display text-2xl font-bold tracking-[0.06em]">History</h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                    {historyView === 'game'
                      ? 'Games you launched from the lobby'
                      : 'Wallet debits and credits from play'}
                  </p>
                </div>
                <div className="history-tabs" role="tablist" aria-label="History type">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={historyView === 'game'}
                    className={`history-tab ${historyView === 'game' ? 'is-active' : ''}`}
                    onClick={() => setHistoryView('game')}
                  >
                    Game history
                    <span className="history-tab-count">{gameHistory.length}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={historyView === 'wallet'}
                    className={`history-tab ${historyView === 'wallet' ? 'is-active' : ''}`}
                    onClick={() => setHistoryView('wallet')}
                  >
                    Wallet history
                    <span className="history-tab-count">{moneyHistory.length}</span>
                  </button>
                </div>
                <div className="history-panel">
                  {historyLoading ? (
                    <p className="px-5 py-12 text-center font-display text-sm tracking-[0.18em] text-[var(--muted)]">
                      LOADING HISTORY…
                    </p>
                  ) : !visibleHistory.length ? (
                    <div className="px-5 py-14 text-center">
                      <p className="font-display text-sm tracking-[0.2em] text-[var(--muted)]">
                        {historyView === 'game' ? 'NO GAME ACTIVITY YET' : 'NO WALLET ACTIVITY YET'}
                      </p>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        {historyView === 'game'
                          ? 'Launch a game from the lobby to see sessions here.'
                          : 'Debits and credits from play will show up here.'}
                      </p>
                    </div>
                  ) : (
                    visibleHistory.map((row) => {
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
                              <p className="font-display text-sm font-bold text-[var(--muted)]">
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
                <div className="profile-header-card">
                  <div className="profile-header-main">
                    <div className="profile-avatar-wrap" aria-hidden="true">
                      <span className="profile-avatar-fallback">{userInitials(user.username)}</span>
                      <span className="profile-status-dot" title="Active" />
                    </div>
                    <div className="profile-header-text min-w-0">
                      <p className="profile-eyebrow">Player profile</p>
                      <h2 className="profile-name">{user.username || 'Player'}</h2>
                      <p className="profile-phone">
                        {user.phone ? `+91 ${user.phone}` : 'Phone not linked'}
                      </p>
                      <span className="profile-status-pill">Active account</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="btn-game btn-purple profile-refresh-btn"
                  >
                    {refreshing ? 'Refreshing…' : 'Refresh balance'}
                  </button>
                </div>

                <div className="profile-metrics">
                  <div className="profile-metric">
                    <p className="profile-metric-label">Wallet balance</p>
                    <p className="profile-metric-value accent">
                      ₹{Number(user.balance ?? 0).toLocaleString('en-IN')}
                    </p>
                    <p className="profile-metric-hint">Available to play</p>
                  </div>
                  <div className="profile-metric">
                    <p className="profile-metric-label">Games played</p>
                    <p className="profile-metric-value">
                      {new Set(
                        gameHistory
                          .filter((h) => (h.type || h.kind) === 'LAUNCH')
                          .map((h) => h.gameId)
                          .filter(Boolean),
                      ).size}
                    </p>
                    <p className="profile-metric-hint">Unique titles launched</p>
                  </div>
                  <div className="profile-metric">
                    <p className="profile-metric-label">Total activity</p>
                    <p className="profile-metric-value">{gameHistory.length}</p>
                    <p className="profile-metric-hint">Launches & transactions</p>
                  </div>
                </div>

                <div className="profile-layout">
                  <section className="profile-card">
                    <div className="profile-card-head">
                      <h3 className="profile-card-title">Account information</h3>
                      <p className="profile-card-subtitle">Your registered player details</p>
                    </div>
                    <dl className="profile-info-list">
                      <div className="profile-info-row">
                        <dt>Display name</dt>
                        <dd>{user.username || '—'}</dd>
                      </div>
                      <div className="profile-info-row">
                        <dt>Phone number</dt>
                        <dd>{user.phone ? `+91 ${user.phone}` : '—'}</dd>
                      </div>
                      <div className="profile-info-row">
                        <dt>Player ID</dt>
                        <dd className="profile-mono" title={userId}>
                          {shortId(userId)}
                        </dd>
                      </div>
                      <div className="profile-info-row">
                        <dt>Currency</dt>
                        <dd>INR (₹)</dd>
                      </div>
                      <div className="profile-info-row">
                        <dt>Account status</dt>
                        <dd>
                          <span className="profile-inline-pill">Active</span>
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <section className="profile-card">
                    <div className="profile-card-head">
                      <h3 className="profile-card-title">Quick actions</h3>
                      <p className="profile-card-subtitle">Manage play and account access</p>
                    </div>
                    <div className="profile-actions">
                      <button
                        type="button"
                        className="btn-game btn-play profile-action-btn"
                        onClick={() => selectTab('games')}
                      >
                        Play games
                      </button>
                      <button
                        type="button"
                        className="btn-game btn-purple profile-action-btn"
                        onClick={() => selectTab('history')}
                      >
                        View full history
                      </button>
                      <button
                        type="button"
                        className="btn-game btn-danger profile-action-btn"
                        onClick={logout}
                      >
                        <IconLogout />
                        Sign out
                      </button>
                    </div>
                  </section>
                </div>

                <section className="profile-card profile-activity-card">
                  <div className="profile-card-head profile-card-head-row">
                    <div>
                      <h3 className="profile-card-title">Recent activity</h3>
                      <p className="profile-card-subtitle">Latest wallet and game events</p>
                    </div>
                    <button
                      type="button"
                      className="profile-link-btn"
                      onClick={() => selectTab('history')}
                    >
                      View all
                    </button>
                  </div>

                  {recentActivity.length ? (
                    <div className="profile-activity-list">
                      {recentActivity.map((row) => {
                        const type = String(row.type || row.kind || '').toUpperCase()
                        const isLaunch = type === 'LAUNCH'
                        const isDebit = type === 'DEBIT' || type === 'BET'
                        const isCredit = type === 'CREDIT' || type === 'WIN'
                        const label = isLaunch
                          ? 'Play'
                          : isDebit
                            ? 'Debit'
                            : isCredit
                              ? 'Credit'
                              : type || 'Event'
                        return (
                          <div key={`profile-${row.kind}-${row.id}`} className="profile-activity-row">
                            <div className="profile-activity-main min-w-0">
                              <span
                                className={`profile-activity-badge ${
                                  isLaunch ? 'neutral' : isDebit ? 'debit' : 'credit'
                                }`}
                              >
                                {label}
                              </span>
                              <div className="min-w-0">
                                <p className="profile-activity-title">
                                  {row.gameTitle || row.gameId || 'Wallet'}
                                </p>
                                <p className="profile-activity-meta">{formatWhen(row.createdAt)}</p>
                              </div>
                            </div>
                            <div className="profile-activity-amount">
                              {isLaunch ? (
                                <span className="profile-activity-muted">Session</span>
                              ) : (
                                <span className={isDebit ? 'is-debit' : 'is-credit'}>
                                  {isDebit ? '−' : '+'}₹
                                  {Math.abs(Number(row.amount) || 0).toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="profile-empty">
                      <p>No activity yet</p>
                      <button
                        type="button"
                        className="btn-game btn-play profile-empty-btn"
                        onClick={() => selectTab('games')}
                      >
                        Browse games
                      </button>
                    </div>
                  )}
                </section>
              </div>
            ) : null}
          </section>

          {showLobby ? (
            <aside className="space-y-3">
              <div className="side-card">
                <p className="font-display text-[0.65rem] font-bold tracking-[0.16em] text-[var(--muted)]">
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
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#333333] bg-[var(--panel-2)] px-2.5 py-2 text-left hover:border-[#444444]"
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
                <p className="font-display text-[0.65rem] font-bold tracking-[0.16em] text-[var(--muted)]">
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
