import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { fetchHistory, fetchHeroBanners, fetchGames } from '../api'
import HeroSection from '../components/HeroSection'
import GamesGrid from '../components/GamesGrid'
import siteLogo from '../assets/logo-123games.png'

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
  const parts = String(name || 'Player')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return String(name || 'PL').slice(0, 2).toUpperCase()
}

function historyKind(row) {
  return String(row?.type || row?.kind || '').toUpperCase()
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  )
}

function IconHistory() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12a8 8 0 1 0 2.3-5.7" />
      <path d="M4 5v4h4" />
      <path d="M12 8v5l3 2" />
    </svg>
  )
}

function IconProfile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.5-3.2 4-4.5 7-4.5s5.5 1.3 7 4.5" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 7V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-2" />
      <path d="M15 12H3m0 0 3-3m-3 3 3 3" />
    </svg>
  )
}

function IconRefresh({ spinning, className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.15rem"
      height="1.15rem"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} ${spinning ? 'animate-spin' : ''} shrink-0`}
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

const NAV = [
  { id: 'lobby', label: 'Home', Icon: IconHome },
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
    const allowed = ['lobby', 'history', 'wallet']
    if (allowed.includes(fromState)) return fromState
    if (allowed.includes(fromQuery)) return fromQuery
    if (allowed.includes(fromStore)) return fromStore
    return 'lobby'
  })

  const [menuOpen, setMenuOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [banners, setBanners] = useState([])
  const [bannersLoading, setBannersLoading] = useState(false)
  const [games, setGames] = useState([])
  const [gamesLoading, setGamesLoading] = useState(false)
  const [gamesError, setGamesError] = useState('')
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [copiedId, setCopiedId] = useState('')

  const userId = user?.id || user?.playerId

  useEffect(() => {
    sessionStorage.setItem('allgames_tab', tab)
  }, [tab])

  useEffect(() => {
    const fromState = location.state?.tab
    const fromQuery = searchParams.get('tab')
    const allowed = ['lobby', 'history', 'wallet']
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

  function showToast(msg) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  function copyText(text, label = 'Copied') {
    if (!text) return
    navigator.clipboard?.writeText(String(text)).then(() => {
      setCopiedId(text)
      showToast(`${label} copied to clipboard!`)
      setTimeout(() => setCopiedId(''), 2000)
    })
  }

  const moneyHistory = useMemo(() => history, [history])

  function loadGames() {
    setGamesLoading(true)
    setGamesError('')
    return fetchGames()
      .then((res) => setGames(res.data || []))
      .catch((err) => {
        setGames([])
        setGamesError(err.message || 'Failed to load games')
      })
      .finally(() => setGamesLoading(false))
  }

  useEffect(() => {
    if (!userId) return
    refreshBalance().catch(() => {})
    fetchHistory(40)
      .then((res) => setHistory(res.data?.feed || res.data?.transactions || []))
      .catch(() => {})
    setBannersLoading(true)
    fetchHeroBanners()
      .then((res) => setBanners(res.data || []))
      .catch(() => setBanners([]))
      .finally(() => setBannersLoading(false))
    loadGames()
  }, [userId, refreshBalance])

  useEffect(() => {
    if (!userId || tab !== 'history') return
    let cancelled = false
    setHistoryLoading(true)
    fetchHistory(60)
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
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
          <p className="font-display text-sm tracking-[0.2em] text-[var(--gold)]">LOADING…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  async function onRefresh() {
    setRefreshing(true)
    setError('')
    try {
      await refreshBalance()
      const [historyRes, bannersRes, gamesRes] = await Promise.all([
        fetchHistory(60),
        fetchHeroBanners().catch(() => ({ data: banners })),
        fetchGames().catch(() => ({ data: games })),
      ])
      setHistory(historyRes.data?.feed || historyRes.data?.transactions || [])
      setBanners(bannersRes.data || [])
      setGames(gamesRes.data || [])
      showToast('Wallet balance refreshed!')
    } catch (err) {
      setError(err.message || 'Refresh failed')
    } finally {
      setRefreshing(false)
    }
  }

  function selectTab(id) {
    setError('')
    setTab(id)
    setMenuOpen(false)
  }

  const showLobby = tab === 'lobby'
  const showHistory = tab === 'history'
  const showWallet = tab === 'wallet'

  return (
    <div className={`dash text-[var(--text)] ${menuOpen ? 'menu-open' : ''}`}>
      {toastMessage ? (
        <div className="toast-bubble" role="status">
          <span>{toastMessage}</span>
        </div>
      ) : null}

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

        <div className="dash-brand">
          <img src={siteLogo} alt="123Games" className="site-logo" />
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
              <span className="nav-item-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-divider" />
          <button
            type="button"
            className="sidebar-support-btn border border-orange-600"
            onClick={() => {
              setMenuOpen(false)
              logout()
            }}
          >
            <span className="sidebar-support-left">
              <IconLogout />
              <span>Sign Out</span>
            </span>
            <span className="sidebar-badge">Exit</span>
          </button>
        </div>
      </aside>

      <div className="dash-content">
        <div className="mobile-topbar">
          <div className="flex items-center gap-2 min-w-0">
            <img src={siteLogo} alt="123Games" className="site-logo site-logo-sm" />
          </div>
          <div className="mobile-topbar-right">
            <div className="chip chip-compact px-2 py-0.5">
              <p className="font-display text-[0.68rem] font-bold tracking-wide text-emerald-400">
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
          <div className="flex items-center gap-2.5">
            <p className="text-sm font-semibold text-[var(--muted)]">Welcome back</p>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="chip header-wallet-chip px-2.5 py-1">
              <div className="leading-tight">
                <p className="text-[0.52rem] font-bold uppercase tracking-[0.12em] text-white/60 leading-none">
                  Wallet
                </p>
                <p className="font-display text-xs sm:text-sm font-bold tracking-wide text-emerald-400 leading-tight mt-0.5">
                  ₹{Number(user.balance ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh Balance"
              aria-label="Refresh Balance"
              className="btn-game btn-purple p-1.5 sm:p-2 text-white hover:text-amber-400 hover:border-amber-400/50 transition-all flex items-center justify-center shrink-0"
            >
              <IconRefresh spinning={refreshing} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </button>

            <button
              type="button"
              onClick={() => selectTab('wallet')}
              className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:border-amber-400/40 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black font-extrabold text-[0.62rem] grid place-items-center">
                {userInitials(user.username)}
              </div>
              <span className="text-[0.68rem] font-semibold text-white max-w-[5.5rem] truncate">
                {user.username || 'Player'}
              </span>
            </button>
          </div>
        </header>

        <div className="dash-body dash-body-single">
          <section className="min-w-0 space-y-2.5">
            {error ? (
              <p className="rounded-xl border border-[var(--danger)]/35 bg-[var(--danger)]/10 px-4 py-3 text-sm font-semibold text-[#fecdd3]">
                {error}
              </p>
            ) : null}

            {showLobby ? (
              <div className="space-y-2.5">
                <HeroSection
                  banners={banners}
                  loading={bannersLoading}
                />
                <GamesGrid
                  games={games}
                  loading={gamesLoading}
                  error={gamesError}
                  onRetry={loadGames}
                  onPlay={(game) => {
                    const key = game.slug || game.code || game.id || 'game'
                    navigate(`/play/${encodeURIComponent(key)}`, {
                      state: { game },
                    })
                  }}
                />
              </div>
            ) : null}

            {showHistory ? (
              <div>
                <div className="mb-4">
                  <h2 className="font-display text-2xl font-bold tracking-[0.06em]">
                    Wallet History
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                    Credits, debits, and balance changes
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3.5 rounded-xl border border-white/10 bg-[var(--panel)]">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">
                      Total Credits
                    </p>
                    <p className="font-display text-xl font-bold text-emerald-400 mt-1">
                      ₹
                      {moneyHistory
                        .filter((r) => ['CREDIT', 'WIN'].includes(historyKind(r)))
                        .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
                        .toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-white/10 bg-[var(--panel)]">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">
                      Wallet Balance
                    </p>
                    <p className="font-display text-xl font-bold text-amber-400 mt-1">
                      ₹{Number(user.balance ?? 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="history-panel">
                  {historyLoading ? (
                    <div className="py-16 text-center">
                      <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="font-display text-xs tracking-widest text-[var(--muted)]">
                        LOADING HISTORY…
                      </p>
                    </div>
                  ) : !moneyHistory.length ? (
                    <div className="px-5 py-14 text-center">
                      <p className="font-display text-sm tracking-[0.2em] text-[var(--muted)]">
                        NO WALLET ACTIVITY YET
                      </p>
                    </div>
                  ) : (
                    moneyHistory.map((row) => {
                      const type = historyKind(row)
                      const isDebit = type === 'DEBIT' || type === 'BET'
                      const isCredit = type === 'CREDIT' || type === 'WIN'
                      const label = isDebit ? 'DEBIT' : isCredit ? 'CREDIT' : type || 'TX'
                      const amount = Math.abs(Number(row.amount) || 0)
                      const targetId = row.transactionId || row.roundId

                      return (
                        <div key={`${label}-${row.id || row.transactionId}`} className="history-row">
                          <span
                            className={`history-badge ${isDebit ? 'bet' : isCredit ? 'win' : 'tx'}`}
                          >
                            {label}
                          </span>
                          <div className="min-w-0">
                            <p className="font-display truncate text-sm font-bold tracking-wide">
                              {row.gameId || 'Wallet Transfer'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="truncate text-xs font-semibold text-[var(--muted)]">
                                {shortId(row.transactionId || row.roundId)}
                                {row.status ? ` · ${row.status}` : ''}
                              </span>
                              {targetId ? (
                                <button
                                  type="button"
                                  title="Copy ID"
                                  className="text-[var(--muted)] hover:text-white p-0.5"
                                  onClick={() => copyText(targetId, 'Transaction ID')}
                                >
                                  {copiedId === targetId ? <IconCheck /> : <IconCopy />}
                                </button>
                              ) : null}
                            </div>
                          </div>
                          <div className="history-meta text-right">
                            <p
                              className={`font-display text-sm font-bold ${
                                isDebit ? 'text-[#fda4af]' : 'text-[var(--lime)]'
                              }`}
                            >
                              {isDebit ? '−' : '+'}₹{amount.toLocaleString('en-IN')}
                            </p>
                            <p className="mt-0.5 text-xs text-[var(--muted)]">
                              {formatWhen(row.createdAt)}
                            </p>
                            {typeof row.balanceAfter === 'number' ? (
                              <p className="text-[0.65rem] text-[var(--muted)]">
                                Balance: ₹{Number(row.balanceAfter).toLocaleString('en-IN')}
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
                      <span className="profile-avatar-fallback bg-gradient-to-tr from-amber-600 to-yellow-400 text-black font-extrabold text-2xl">
                        {userInitials(user.username)}
                      </span>
                    </div>
                    <div className="profile-header-text min-w-0">
                      <p className="profile-eyebrow text-amber-400">Member</p>
                      <h2 className="profile-name">{user.username || 'Player'}</h2>
                      <p className="profile-phone">
                        {user.phone ? `+91 ${user.phone}` : 'Verified Phone'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="btn-game btn-purple profile-refresh-btn"
                  >
                    {refreshing ? 'Refreshing…' : 'Refresh Balance'}
                  </button>
                </div>

                <div className="profile-metrics">
                  <div className="profile-metric">
                    <p className="profile-metric-label">Available Balance</p>
                    <p className="profile-metric-value accent">
                      ₹{Number(user.balance ?? 0).toLocaleString('en-IN')}
                    </p>
                    <p className="profile-metric-hint">Current wallet balance</p>
                  </div>
                  <div className="profile-metric">
                    <p className="profile-metric-label">Total Transactions</p>
                    <p className="profile-metric-value">{history.length}</p>
                    <p className="profile-metric-hint">Wallet credits and debits</p>
                  </div>
                </div>

                <div className="profile-layout">
                  <section className="profile-card">
                    <div className="profile-card-head">
                      <h3 className="profile-card-title">Account Details</h3>
                      <p className="profile-card-subtitle">Registered identity and wallet info</p>
                    </div>
                    <dl className="profile-info-list">
                      <div className="profile-info-row">
                        <dt>Display Name</dt>
                        <dd>{user.username || '—'}</dd>
                      </div>
                      <div className="profile-info-row">
                        <dt>Phone Number</dt>
                        <dd>{user.phone ? `+91 ${user.phone}` : '—'}</dd>
                      </div>
                      <div className="profile-info-row">
                        <dt>Player ID</dt>
                        <dd className="profile-mono flex items-center justify-end gap-1.5" title={userId}>
                          <span>{shortId(userId)}</span>
                          <button
                            type="button"
                            className="text-amber-400 hover:text-amber-300 p-0.5"
                            onClick={() => copyText(userId, 'Player ID')}
                            title="Copy Player ID"
                          >
                            {copiedId === userId ? <IconCheck /> : <IconCopy />}
                          </button>
                        </dd>
                      </div>
                      <div className="profile-info-row">
                        <dt>Currency</dt>
                        <dd>INR (₹)</dd>
                      </div>
                    </dl>
                  </section>

                  <section className="profile-card">
                    <div className="profile-card-head">
                      <h3 className="profile-card-title">Quick Actions</h3>
                      <p className="profile-card-subtitle">Navigation and account options</p>
                    </div>
                    <div className="profile-actions">
                      <button
                        type="button"
                        className="btn-game btn-purple profile-action-btn"
                        onClick={() => selectTab('history')}
                      >
                        View Statements
                      </button>
                      <button
                        type="button"
                        className="btn-game btn-danger profile-action-btn"
                        onClick={logout}
                      >
                        <IconLogout />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <nav className="mobile-bottom-dock" aria-label="Mobile Navigation">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`dock-item ${tab === id ? 'is-active' : ''}`}
              onClick={() => selectTab(id)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
