import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { fetchGames, fetchHistory, launchGame } from '../api'

/** Public CDN images (Unsplash / Wikimedia) for lobby art */
const IMAGES = {
  logo: 'https://images.unsplash.com/photo-1596838132731-330a250f1a9b?auto=format&fit=crop&w=200&q=80',
  hero: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=1400&q=80',
  teenpatti: 'https://images.unsplash.com/photo-1541278107931-e006523892df?auto=format&fit=crop&w=900&q=80',
  ludo: 'https://store-images.s-microsoft.com/image/apps.38011.13964317340864868.4c21ecf1-2804-40c6-bd9e-a2efd241f30b.7fb161ca-d8f2-4e3a-9f2b-4992fa436cd1?q=90&w=480&h=270',
  wallet: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=700&q=80',
  chips: 'https://images.unsplash.com/photo-1596838132734-330b0229d1b2?auto=format&fit=crop&w=700&q=80',
  liveGames:
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQA8gnw7PDZ1OHYlFRV9SkY_Nf5FMYtxnC26f2c-GZ-T3mTBd0vN4beHNc&s=10',
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

function IconWallet() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19a2 2 0 0 1 2 2v1H7.5A2.5 2.5 0 0 0 5 10.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5h-5.5a1.5 1.5 0 0 0 0 3H21" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.5-3.2 4-4.5 7-4.5s5.5 1.3 7 4.5" />
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

const NAV = [
  { id: 'lobby', label: 'Lobby', Icon: IconHome },
  { id: 'games', label: 'Games', Icon: IconGames },
  { id: 'history', label: 'History', Icon: IconHistory },
  { id: 'wallet', label: 'Wallet', Icon: IconWallet },
]

export default function Home() {
  const { user, loading, logout, refreshBalance } = useAuth()
  const [tab, setTab] = useState('lobby')
  const [games, setGames] = useState([])
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState('')
  const [launching, setLaunching] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const userId = user?.id || user?.playerId

  const recent = useMemo(() => history.slice(0, 4), [history])

  useEffect(() => {
    if (!userId) return
    fetchGames()
      .then((res) => setGames(res.data || []))
      .catch((err) => setError(err.message))
    refreshBalance().catch(() => {})
    fetchHistory(40)
      .then((res) => setHistory(res.data?.feed || []))
      .catch(() => {})
  }, [userId, refreshBalance])

  useEffect(() => {
    if (!userId || tab !== 'history') return
    let cancelled = false
    setHistoryLoading(true)
    fetchHistory(60)
      .then((res) => {
        if (!cancelled) setHistory(res.data?.feed || [])
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
      const [gamesRes, historyRes] = await Promise.all([fetchGames(), fetchHistory(60)])
      setGames(gamesRes.data || [])
      setHistory(historyRes.data?.feed || [])
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
      window.location.assign(url)
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

  return (
    <div className="dash text-[var(--text)]">
      <aside className="dash-sidebar">
        <div className="dash-brand">
          <img src={IMAGES.logo} alt="" />
          <div>
            <p className="dash-brand-title">ALLGAMES</p>
            <p className="text-xs font-semibold tracking-wide text-[var(--muted)]">Player Lobby</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`nav-item ${tab === id ? 'is-active' : ''}`}
              onClick={() => {
                setError('')
                setTab(id)
              }}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>

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
            onClick={() => setTab('wallet')}
          >
            View Wallet
          </button>
        </div>
      </aside>

      <div className="dash-content">
        <header className="dash-header">
          <div>
            <h1 className="font-display text-lg font-bold tracking-wide sm:text-xl">
              WELCOME BACK,{' '}
              <span className="text-[var(--gold)]">{String(user.username || 'PLAYER').toUpperCase()}</span>
            </h1>
            <p className="mt-0.5 text-sm font-semibold text-[var(--muted)]">
              Player lobby · pick a table and play
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="chip">
              <span className="chip-icon">
                <IconUser />
              </span>
              <div className="leading-tight">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                  Player ID
                </p>
                <p className="font-display text-[0.7rem] font-bold tracking-wider text-[var(--lime)]">
                  {shortId(user.id || user.playerId)}
                </p>
              </div>
            </div>

            <div className="chip">
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
            <button
              type="button"
              onClick={logout}
              className="btn-game btn-danger px-3.5 py-2.5 text-[0.62rem]"
            >
              Logout
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

            {showLobby ? (
              <>
                <div className="hero-banner">
                  <img src={IMAGES.hero} alt="" />
                  <div className="hero-copy">
                    <p className="font-display text-[0.65rem] font-bold tracking-[0.28em] text-[var(--lime)]">
                      FEATURED
                    </p>
                    <h2 className="font-display mt-1 text-2xl font-extrabold tracking-[0.08em] sm:text-3xl">
                      CASINO ARENA
                    </h2>
                    <p className="mt-2 max-w-md text-sm font-semibold text-white/75">
                      Play Teen Patti, Ludo and more with your live wallet balance.
                    </p>
                  </div>
                </div>
                {renderGameCards()}
              </>
            ) : null}

            {showGamesOnly ? renderGameCards() : null}

            {showHistory ? (
              <div>
                <div className="mb-4">
                  <h2 className="font-display text-2xl font-bold tracking-[0.06em]">Game History</h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                    Launches, bets, and wins for your account
                  </p>
                </div>
                <div className="history-panel">
                  {historyLoading ? (
                    <p className="px-5 py-12 text-center font-display text-sm tracking-[0.18em] text-[var(--muted)]">
                      LOADING HISTORY…
                    </p>
                  ) : !history.length ? (
                    <div className="px-5 py-14 text-center">
                      <p className="font-display text-sm tracking-[0.2em] text-[var(--muted)]">
                        NO HISTORY YET
                      </p>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        Play a game and activity will appear here.
                      </p>
                    </div>
                  ) : (
                    history.map((row) => {
                      const signed =
                        row.kind === 'BET' || String(row.type || '').toUpperCase() === 'DEBIT'
                          ? -Math.abs(Number(row.amount) || 0)
                          : row.kind === 'WIN' || String(row.type || '').toUpperCase() === 'CREDIT'
                            ? Math.abs(Number(row.amount) || 0)
                            : null
                      const isMoney = signed !== null
                      return (
                        <div key={`${row.kind}-${row.id}`} className="history-row">
                          <span className={`history-badge ${badgeClass(row.kind)}`}>{row.kind}</span>
                          <div className="min-w-0">
                            <p className="font-display truncate text-sm font-bold tracking-wide">
                              {row.gameTitle || row.gameId || 'Game'}
                            </p>
                            <p className="mt-0.5 truncate text-xs font-semibold text-[var(--muted)]">
                              {row.kind === 'LAUNCH'
                                ? `Session ${shortId(row.sessionId)}`
                                : shortId(row.transactionId || row.roundId)}
                            </p>
                          </div>
                          <div className="history-meta text-right">
                            {isMoney ? (
                              <p
                                className={`font-display text-sm font-bold ${
                                  signed < 0 ? 'text-[#fda4af]' : 'text-[var(--lime)]'
                                }`}
                              >
                                {signed < 0 ? '−' : '+'}₹
                                {Math.abs(signed).toLocaleString('en-IN')}
                              </p>
                            ) : (
                              <p className="font-display text-xs font-bold tracking-wider text-[var(--muted)]">
                                OPENED
                              </p>
                            )}
                            <p className="mt-0.5 text-xs text-[var(--muted)]">
                              {formatWhen(row.createdAt)}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ) : null}

            {showWallet ? (
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="side-card !p-0 overflow-hidden">
                  <img
                    src={IMAGES.wallet}
                    alt=""
                    className="!mb-0 h-44 !rounded-none object-cover opacity-90"
                  />
                  <div className="p-5">
                    <p className="font-display text-[0.65rem] font-bold tracking-[0.2em] text-[var(--gold)]">
                      WALLET
                    </p>
                    <h2 className="font-display mt-1 text-3xl font-extrabold tracking-wide text-[var(--gold)]">
                      ₹{Number(user.balance ?? 0).toLocaleString('en-IN')}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
                      Balance updates when you bet or win in games. Use Refresh after returning from a
                      game.
                    </p>
                    <button
                      type="button"
                      onClick={onRefresh}
                      className="btn-game btn-purple mt-4 px-5 py-2.5 text-[0.65rem]"
                    >
                      Refresh Balance
                    </button>
                  </div>
                </div>
                <div className="side-card">
                  <img src={IMAGES.chips} alt="" />
                  <p className="font-display text-sm font-bold tracking-wide">Player account</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
                    ID: {user.id || user.playerId}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                    Phone: {user.phone || '—'}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                    Name: {user.username}
                  </p>
                </div>
              </div>
            ) : null}
          </section>

          {showLobby ? (
            <aside className="space-y-3">
              <div className="flex justify-end">
                <span className="live-pill">
                  <span className="live-dot" />
                  {games.length} LIVE
                </span>
              </div>

              <div className="side-card">
                <img src={IMAGES.liveGames} alt="Live Games" />
                <p className="font-display text-[0.65rem] font-bold tracking-[0.16em] text-[var(--gold)]">
                  LIVE GAMES
                </p>
                <p className="mt-1 text-sm font-bold">
                  {games.length
                    ? games.map((g) => g.title || g.name || g.gameId).join(' · ')
                    : 'None yet'}
                </p>
                <button
                  type="button"
                  className="btn-game btn-play mt-3 w-full py-2.5 text-[0.62rem]"
                  onClick={() => setTab('games')}
                >
                  Open Games
                </button>
              </div>

              <div className="side-card">
                <p className="font-display text-[0.65rem] font-bold tracking-[0.16em] text-[var(--violet)]">
                  RECENT ACTIVITY
                </p>
                <div className="mt-3 space-y-2.5">
                  {recent.length ? (
                    recent.map((row) => (
                      <button
                        key={`side-${row.kind}-${row.id}`}
                        type="button"
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-2.5 py-2 text-left hover:border-[var(--purple)]/40"
                        onClick={() => setTab('history')}
                      >
                        <span className="truncate text-xs font-bold">
                          {row.kind} · {row.gameTitle || row.gameId || 'Game'}
                        </span>
                        <span className="shrink-0 text-[0.65rem] text-[var(--muted)]">
                          {formatWhen(row.createdAt)}
                        </span>
                      </button>
                    ))
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
                  Details
                </button>
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  )
}
