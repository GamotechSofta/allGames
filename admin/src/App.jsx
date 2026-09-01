import { useEffect, useMemo, useState } from 'react'
import {
  addGame,
  addPlayer,
  adminLogin,
  deleteGame,
  getAdmin,
  listGames,
  listPlayers,
  setAdmin,
  toggleGame,
  updateGameLaunchUrl,
  updatePlayerWallet,
  fetchPlayerHistory,
} from './api'
import siteLogo from './assets/image.png'

function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </svg>
  )
}

function IconPlayers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 19c1.2-2.8 3.4-4 6-4s4.8 1.2 6 4" />
      <path d="M14 19c.6-1.6 1.8-2.5 3.5-2.5S20.8 17.4 21.5 19" />
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

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}

function IconRefresh() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

function userInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
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

function formatCurrency(value) {
  const n = Math.abs(Number(value) || 0)
  const sign = Number(value) < 0 ? '−' : ''
  return `${sign}₹${n.toLocaleString('en-IN')}`
}

function CurrencyAmount({ value, className = '' }) {
  const text = formatCurrency(value)
  const long = text.length > 12
  return (
    <span
      className={`currency-amount ${long ? 'is-long' : ''} ${className}`.trim()}
      title={long ? text : undefined}
    >
      {text}
    </span>
  )
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

function PlayerHistoryModal({ player, history, loading, onClose }) {
  const [historyView, setHistoryView] = useState('game')

  const gameHistory = useMemo(() => history.filter(isLaunchHistoryRow), [history])
  const walletHistory = useMemo(() => history.filter(isWalletHistoryRow), [history])
  const visibleHistory = historyView === 'game' ? gameHistory : walletHistory

  useEffect(() => {
    setHistoryView('game')
  }, [player?.id])
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="admin-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="admin-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-history-title"
      >
        <div className="admin-modal-header">
          <div className="min-w-0">
            <p className="font-display text-[0.65rem] font-bold tracking-[0.2em] text-[var(--muted)]">
              PLAYER HISTORY
            </p>
            <h2 id="player-history-title" className="font-display mt-1 truncate text-xl font-bold tracking-wide">
              {player.username}
            </h2>
            <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
              {player.phone ? `+91 ${player.phone}` : shortId(player.id)} · Game launches & wallet activity
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="admin-modal-close"
            aria-label="Close history"
          >
            <IconClose />
          </button>
        </div>

        <div className="admin-modal-body">
          <div className="history-tabs mb-4" role="tablist" aria-label="History type">
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
              <span className="history-tab-count">{walletHistory.length}</span>
            </button>
          </div>

          {loading ? (
            <p className="py-12 text-center text-sm font-semibold text-[var(--muted)]">
              Loading history…
            </p>
          ) : !visibleHistory.length ? (
            <p className="py-12 text-center text-sm font-semibold text-[var(--muted)]">
              {historyView === 'game'
                ? 'No game launches yet for this player.'
                : 'No wallet transactions yet for this player.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table min-w-full">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Game</th>
                    <th>Details</th>
                    <th>Amount</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleHistory.map((row) => {
                    const type = String(row.type || row.kind || '').toUpperCase()
                    const isLaunch = type === 'LAUNCH'
                    const isDebit = type === 'DEBIT'
                    const isCredit = type === 'CREDIT'
                    const label = isLaunch
                      ? 'PLAY'
                      : isDebit
                        ? 'DEBIT'
                        : isCredit
                          ? 'CREDIT'
                          : type || 'TX'
                    return (
                      <tr key={`${label}-${row.id}`}>
                        <td>
                          <span
                            className={`status-pill ${
                              isLaunch ? 'active' : isDebit ? 'inactive' : 'active'
                            }`}
                          >
                            {label}
                          </span>
                        </td>
                        <td className="font-semibold text-white">
                          {row.gameTitle || row.gameId || 'Wallet'}
                        </td>
                        <td className="text-xs text-[var(--muted)]">
                          {isLaunch
                            ? `Session ${shortId(row.sessionId)}`
                            : shortId(row.transactionId || row.roundId)}
                          {row.rolledBack ? ' · rolled back' : ''}
                        </td>
                        <td className="font-display font-bold">
                          {isLaunch ? (
                            <span className="text-[var(--muted)]">—</span>
                          ) : (
                            <span className={isDebit ? 'text-[#fda4af]' : 'text-[var(--lime)]'}>
                              {isDebit ? '−' : '+'}₹
                              {Math.abs(Number(row.amount) || 0).toLocaleString('en-IN')}
                            </span>
                          )}
                        </td>
                        <td className="text-xs text-[var(--muted)]">{formatWhen(row.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-modal-footer">
          <button type="button" onClick={onClose} className="btn-game btn-ghost px-4 py-2 text-[0.65rem]">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await adminLogin(username, password)
      setAdmin(res.data)
      onLogin(res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-login-wrap">
      <form onSubmit={onSubmit} className="admin-panel space-y-5">
        <div className="flex items-center gap-3">
          <img src={siteLogo} alt="AllGames" className="site-logo" />
          <div>
            <p className="font-display text-[0.7rem] font-bold tracking-[0.3em] text-[var(--muted)]">
              ALLGAMES
            </p>
            <h1 className="font-display mt-1 text-2xl font-bold tracking-wide">Admin Login</h1>
          </div>
        </div>
        <p className="text-sm font-semibold text-[var(--muted)]">
          Manage players, wallets, and game catalog
        </p>

        {error ? (
          <p className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm font-semibold text-[#fecdd3]">
            {error}
          </p>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
            Username
          </span>
          <input
            className="admin-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
            Password
          </span>
          <input
            type="password"
            className="admin-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
        </label>

        <button type="submit" disabled={busy} className="btn-game btn-play w-full py-3 text-sm">
          {busy ? 'Signing in…' : 'Enter Console'}
        </button>
      </form>
    </div>
  )
}

const EMPTY_GAME_FORM = {
  name: '',
  gameId: '',
  provider: '',
  launchUrl: '',
  status: 'active',
}

function PlayerWalletActions({
  player,
  isEditing,
  draft,
  savingWalletId,
  onStartEdit,
  onSave,
  onCancel,
  onHistory,
  onDraftChange,
  compact = false,
}) {
  return (
    <>
      {isEditing ? (
        <>
          <input
            type="number"
            min={0}
            autoFocus
            className={`admin-input text-xs ${compact ? 'player-balance-input' : ''}`}
            value={draft}
            onChange={(e) => onDraftChange(player.id, e.target.value)}
          />
          <div className="player-actions">
            <button
              type="button"
              disabled={savingWalletId === player.id}
              onClick={() => onSave(player)}
              className="btn-game btn-play btn-compact"
            >
              {savingWalletId === player.id ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              disabled={savingWalletId === player.id}
              onClick={onCancel}
              className="btn-game btn-ghost btn-compact"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <span className="player-balance">
            <CurrencyAmount value={player.balance ?? 0} />
          </span>
          <div className="player-actions">
            <button
              type="button"
              onClick={() => onStartEdit(player)}
              className="btn-game btn-ghost btn-compact"
            >
              Edit wallet
            </button>
            <button
              type="button"
              onClick={() => onHistory(player)}
              className="btn-game btn-play btn-compact"
            >
              History
            </button>
          </div>
        </>
      )}
    </>
  )
}

function Dashboard({ admin, onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [games, setGames] = useState([])
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [savingUrlId, setSavingUrlId] = useState('')
  const [savingWalletId, setSavingWalletId] = useState('')
  const [editingWalletId, setEditingWalletId] = useState('')
  const [historyPlayer, setHistoryPlayer] = useState(null)
  const [playerHistory, setPlayerHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [urlDrafts, setUrlDrafts] = useState({})
  const [walletDrafts, setWalletDrafts] = useState({})
  const [playerSearch, setPlayerSearch] = useState('')
  const [gameSearch, setGameSearch] = useState('')
  const [refreshing, setRefreshing] = useState('')
  const [gameForm, setGameForm] = useState(EMPTY_GAME_FORM)
  const [playerForm, setPlayerForm] = useState({
    username: '',
    phone: '',
    password: '',
    balance: '10000',
  })

  const activeGames = useMemo(
    () => games.filter((g) => g.status === 'active' || g.isActive).length,
    [games],
  )
  const totalBalance = useMemo(
    () => players.reduce((sum, p) => sum + (Number(p.balance) || 0), 0),
    [players],
  )
  const inactiveGames = useMemo(
    () => games.filter((g) => !(g.status === 'active' || g.isActive)).length,
    [games],
  )
  const activePlayers = useMemo(
    () => players.filter((p) => p.isActive).length,
    [players],
  )
  const topPlayers = useMemo(
    () =>
      [...players]
        .sort((a, b) => Number(b.balance ?? 0) - Number(a.balance ?? 0))
        .slice(0, 4),
    [players],
  )
  const liveGames = useMemo(
    () => games.filter((g) => g.status === 'active' || g.isActive),
    [games],
  )
  const hiddenGames = useMemo(
    () => games.filter((g) => !(g.status === 'active' || g.isActive)),
    [games],
  )
  const catalogPreview = useMemo(
    () =>
      [
        ...liveGames.map((g) => ({ ...g, isLive: true })),
        ...hiddenGames.map((g) => ({ ...g, isLive: false })),
      ].slice(0, 5),
    [liveGames, hiddenGames],
  )
  const catalogCoverage = useMemo(
    () => (games.length ? Math.round((activeGames / games.length) * 100) : 0),
    [games.length, activeGames],
  )

  const pageMeta = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Platform overview — players, wallets, and game catalog at a glance.',
    },
    players: {
      title: 'Players',
      subtitle: 'Manage player accounts, adjust wallets, and review game activity from one place.',
    },
    games: {
      title: 'Games',
      subtitle: 'Add titles to the catalog, configure launch URLs, and control which games are live.',
    },
  }

  const filteredPlayers = useMemo(() => {
    const q = playerSearch.trim().toLowerCase()
    if (!q) return players
    return players.filter((p) => {
      const haystack = [p.username, p.phone, p.id].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [players, playerSearch])

  const filteredGames = useMemo(() => {
    const q = gameSearch.trim().toLowerCase()
    if (!q) return games
    return games.filter((g) => {
      const haystack = [g.title, g.name, g.gameId, g.provider, g.launchUrl]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [games, gameSearch])

  async function refreshTabData() {
    setRefreshing(tab)
    setError('')
    try {
      if (tab === 'dashboard') {
        await Promise.all([refreshPlayers(), refreshGames()])
      } else if (tab === 'players') {
        await refreshPlayers()
      } else {
        await refreshGames()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setRefreshing('')
    }
  }

  async function refreshGames() {
    const res = await listGames()
    const rows = res.data || []
    setGames(rows)
    setUrlDrafts(
      Object.fromEntries(rows.map((g) => [g.gameId, g.launchUrl || ''])),
    )
  }

  async function refreshPlayers() {
    const res = await listPlayers()
    const rows = res.data || []
    setPlayers(rows)
  }

  function startEditWallet(player) {
    setError('')
    setEditingWalletId(player.id)
    setWalletDrafts((prev) => ({
      ...prev,
      [player.id]: String(Number(player.balance ?? 0)),
    }))
  }

  function cancelEditWallet() {
    setEditingWalletId('')
    setError('')
  }

  async function openPlayerHistory(player) {
    setError('')
    setHistoryPlayer(player)
    setPlayerHistory([])
    setHistoryLoading(true)
    try {
      const res = await fetchPlayerHistory(player.id, 60)
      setPlayerHistory(res.data?.feed || res.data?.transactions || [])
    } catch (err) {
      setError(err.message)
      setHistoryPlayer(null)
    } finally {
      setHistoryLoading(false)
    }
  }

  function closePlayerHistory() {
    setHistoryPlayer(null)
    setPlayerHistory([])
  }

  useEffect(() => {
    Promise.all([refreshGames(), refreshPlayers()]).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!menuOpen && !historyPlayer) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen, historyPlayer])

  function selectTab(next) {
    setTab(next)
    setMenuOpen(false)
    setError('')
    setEditingWalletId('')
    setHistoryPlayer(null)
    setPlayerHistory([])
  }

  async function onAddGame(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await addGame(gameForm)
      setGameForm(EMPTY_GAME_FORM)
      await refreshGames()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function onAddPlayer(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await addPlayer({
        username: playerForm.username,
        phone: playerForm.phone,
        password: playerForm.password,
        balance: Number(playerForm.balance),
      })
      setPlayerForm({ username: '', phone: '', password: '', balance: '10000' })
      await refreshPlayers()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function onToggle(game) {
    setError('')
    try {
      await toggleGame({ gameId: game.gameId })
      await refreshGames()
    } catch (err) {
      setError(err.message)
    }
  }

  async function onDeleteGame(game) {
    const label = game.title || game.name || game.gameId
    if (!window.confirm(`Delete game “${label}”? This cannot be undone.`)) return
    setError('')
    try {
      await deleteGame({ gameId: game.gameId })
      await refreshGames()
    } catch (err) {
      setError(err.message)
    }
  }

  async function onSaveWallet(player) {
    setError('')
    setSavingWalletId(player.id)
    try {
      const balance = Number(walletDrafts[player.id])
      if (!Number.isFinite(balance) || balance < 0) {
        throw new Error('Enter a valid non-negative balance')
      }
      await updatePlayerWallet({
        playerId: player.id,
        balance,
        remarks: `Admin updated wallet to ${balance}`,
      })
      setEditingWalletId('')
      await refreshPlayers()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingWalletId('')
    }
  }

  async function onSaveLaunchUrl(game) {
    setError('')
    setSavingUrlId(game.gameId)
    try {
      await updateGameLaunchUrl({
        gameId: game.gameId,
        launchUrl: urlDrafts[game.gameId] ?? '',
      })
      await refreshGames()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingUrlId('')
    }
  }

  return (
    <div className={`admin-shell dash ${menuOpen ? 'menu-open' : ''}`}>
      <button
        type="button"
        className="nav-backdrop"
        aria-label="Close menu"
        onClick={() => setMenuOpen(false)}
      />

      <aside className="dash-sidebar">
        <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
          <img src={siteLogo} alt="AllGames" className="site-logo" />
          <div className="min-w-0">
            <p className="dash-brand-title">ALLGAMES</p>
            <p className="text-xs font-semibold text-[var(--muted)]">Admin Console</p>
          </div>
          <button
            type="button"
            className="menu-close-btn ml-auto"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <IconClose />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          <button
            type="button"
            className={`nav-item ${tab === 'dashboard' ? 'is-active' : ''}`}
            onClick={() => selectTab('dashboard')}
          >
            <IconDashboard />
            Dashboard
          </button>
          <button
            type="button"
            className={`nav-item ${tab === 'players' ? 'is-active' : ''}`}
            onClick={() => selectTab('players')}
          >
            <IconPlayers />
            Players
          </button>
          <button
            type="button"
            className={`nav-item ${tab === 'games' ? 'is-active' : ''}`}
            onClick={() => selectTab('games')}
          >
            <IconGames />
            Games
          </button>
        </nav>

        <div className="space-y-3">
          <div className="stat-card">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              Signed in
            </p>
            <p className="mt-1 font-display text-sm font-bold text-white">
              {admin.username}
            </p>
          </div>
          <button type="button" onClick={onLogout} className="btn-game btn-danger w-full py-2.5 text-[0.65rem]">
            Logout
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="mobile-topbar">
          <div className="flex items-center gap-2 min-w-0">
            <img src={siteLogo} alt="AllGames" className="site-logo" style={{ width: '2.25rem', height: '2.25rem' }} />
            <p className="dash-brand-title truncate">ADMIN</p>
          </div>
          <button
            type="button"
            className="hamburger-btn"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <IconMenu />
          </button>
        </div>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="admin-page">
            <div className="admin-page-header">
              <div>
                <p className="admin-page-eyebrow">Control center</p>
                <h1 className="admin-page-title">{pageMeta[tab].title}</h1>
                <p className="admin-page-subtitle">{pageMeta[tab].subtitle}</p>
              </div>
              <button
                type="button"
                onClick={refreshTabData}
                disabled={Boolean(refreshing)}
                className="btn-game btn-purple px-4 py-2.5 text-sm"
              >
                <IconRefresh />
                {refreshing === tab ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            {tab === 'dashboard' ? (
              <>
                <div className="admin-metrics dashboard-metrics">
                  <div className="admin-metric">
                    <p className="admin-metric-label">Registered players</p>
                    <p className="admin-metric-value">{players.length}</p>
                    <p className="admin-metric-hint">Total accounts</p>
                  </div>
                  <div className="admin-metric">
                    <p className="admin-metric-label">Total wallet</p>
                    <p className="admin-metric-value is-gold">
                      <CurrencyAmount value={totalBalance} />
                    </p>
                    <p className="admin-metric-hint">Combined balances</p>
                  </div>
                  <div className="admin-metric">
                    <p className="admin-metric-label">Active players</p>
                    <p className="admin-metric-value is-green">{activePlayers}</p>
                    <p className="admin-metric-hint">Launched at least one game</p>
                  </div>
                  <div className="admin-metric">
                    <p className="admin-metric-label">Total games</p>
                    <p className="admin-metric-value">{games.length}</p>
                    <p className="admin-metric-hint">In catalog</p>
                  </div>
                  <div className="admin-metric">
                    <p className="admin-metric-label">Active games</p>
                    <p className="admin-metric-value is-green">{activeGames}</p>
                    <p className="admin-metric-hint">Live in lobby</p>
                  </div>
                  <div className="admin-metric">
                    <p className="admin-metric-label">Catalog coverage</p>
                    <p className="admin-metric-value">{catalogCoverage}%</p>
                    <p className="admin-metric-hint">{inactiveGames} inactive</p>
                  </div>
                </div>

                <div className="dashboard-quick-actions">
                  <button
                    type="button"
                    onClick={() => selectTab('players')}
                    className="dashboard-quick-card"
                  >
                    <span className="dashboard-quick-icon">
                      <IconPlayers />
                    </span>
                    <span className="dashboard-quick-text">
                      <span className="dashboard-quick-title">Manage players</span>
                      <span className="dashboard-quick-desc">{players.length} registered accounts</span>
                      <span className="dashboard-quick-wallet">
                        <CurrencyAmount value={totalBalance} /> in wallets
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectTab('games')}
                    className="dashboard-quick-card"
                  >
                    <span className="dashboard-quick-icon">
                      <IconGames />
                    </span>
                    <span className="dashboard-quick-text">
                      <span className="dashboard-quick-title">Manage games</span>
                      <span className="dashboard-quick-desc">
                        {activeGames} active · {games.length} total in catalog
                      </span>
                    </span>
                  </button>
                </div>

                <div className="dashboard-grid">
                  <section className="admin-section dashboard-panel">
                    <div className="admin-section-head dashboard-panel-head">
                      <div>
                        <h2 className="admin-section-title">Top players</h2>
                        <p className="admin-section-subtitle dashboard-panel-subtitle">
                          Highest wallet balances
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => selectTab('players')}
                        className="dashboard-link-btn"
                      >
                        View all
                      </button>
                    </div>
                    <div className="admin-section-body flush dashboard-panel-body">
                      {!topPlayers.length ? (
                        <div className="admin-empty compact">
                          <p className="admin-empty-title">No players yet</p>
                          <p className="admin-empty-text">Create a player to see rankings here.</p>
                        </div>
                      ) : (
                        <ul className="top-players-list">
                          {topPlayers.map((p, index) => (
                            <li key={p.id} className="top-player-row">
                              <span className="dashboard-rank sm">{index + 1}</span>
                              <span className="player-avatar xs">{userInitials(p.username)}</span>
                              <div className="top-player-info">
                                <p className="top-player-name">{p.username}</p>
                                <p className="top-player-meta">
                                  {p.phone ? `+91 ${p.phone}` : shortId(p.id)}
                                </p>
                              </div>
                              <p className="top-player-balance">
                                <CurrencyAmount value={p.balance ?? 0} />
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>

                  <section className="admin-section dashboard-panel">
                    <div className="admin-section-head dashboard-panel-head">
                      <div>
                        <h2 className="admin-section-title">Game catalog</h2>
                        <p className="admin-section-subtitle dashboard-panel-subtitle">
                          {activeGames} live · {inactiveGames} hidden
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => selectTab('games')}
                        className="dashboard-link-btn"
                      >
                        View all
                      </button>
                    </div>
                    <div className="admin-section-body flush dashboard-panel-body">
                      {!games.length ? (
                        <div className="admin-empty compact">
                          <p className="admin-empty-title">No games yet</p>
                          <p className="admin-empty-text">Add a game to populate the catalog.</p>
                        </div>
                      ) : (
                        <ul className="catalog-compact-list">
                          {catalogPreview.map((g) => (
                            <li key={g._id || g.gameId} className="catalog-compact-row">
                              <span
                                className={`status-pill compact ${g.isLive ? 'active' : 'inactive'}`}
                              >
                                {g.isLive ? 'Live' : 'Off'}
                              </span>
                              <span className="catalog-compact-name">{g.title || g.name}</span>
                              <span className="catalog-compact-id">{g.gameId}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                </div>

                <section className="admin-section">
                  <div className="admin-section-head">
                    <div>
                      <h2 className="admin-section-title">Platform snapshot</h2>
                      <p className="admin-section-subtitle">Key numbers for quick reference</p>
                    </div>
                  </div>
                  <div className="admin-section-body">
                    <dl className="dashboard-info-grid">
                      <div className="dashboard-info-row">
                        <dt>Admin session</dt>
                        <dd>{admin.username}</dd>
                      </div>
                      <div className="dashboard-info-row">
                        <dt>Players with balance &gt; ₹0</dt>
                        <dd>
                          {players.filter((p) => Number(p.balance ?? 0) > 0).length} of {players.length}
                        </dd>
                      </div>
                      <div className="dashboard-info-row">
                        <dt>Games with launch URL</dt>
                        <dd>
                          {games.filter((g) => Boolean(g.launchUrl)).length} of {games.length}
                        </dd>
                      </div>
                      <div className="dashboard-info-row">
                        <dt>Inactive games</dt>
                        <dd>{inactiveGames}</dd>
                      </div>
                    </dl>
                  </div>
                </section>
              </>
            ) : tab === 'players' ? (
              <div className="admin-metrics">
                <div className="admin-metric">
                  <p className="admin-metric-label">Registered players</p>
                  <p className="admin-metric-value">{players.length}</p>
                  <p className="admin-metric-hint">Total accounts on platform</p>
                </div>
                <div className="admin-metric">
                  <p className="admin-metric-label">Total wallet</p>
                  <p className="admin-metric-value is-gold">
                    <CurrencyAmount value={totalBalance} />
                  </p>
                  <p className="admin-metric-hint">Combined player balances</p>
                </div>
                <div className="admin-metric">
                  <p className="admin-metric-label">Active players</p>
                  <p className="admin-metric-value is-green">{activePlayers}</p>
                  <p className="admin-metric-hint">Launched at least one game</p>
                </div>
              </div>
            ) : (
              <div className="admin-metrics">
                <div className="admin-metric">
                  <p className="admin-metric-label">Total games</p>
                  <p className="admin-metric-value">{games.length}</p>
                  <p className="admin-metric-hint">Entries in catalog</p>
                </div>
                <div className="admin-metric">
                  <p className="admin-metric-label">Active games</p>
                  <p className="admin-metric-value is-green">{activeGames}</p>
                  <p className="admin-metric-hint">Visible to players</p>
                </div>
                <div className="admin-metric">
                  <p className="admin-metric-label">Inactive games</p>
                  <p className="admin-metric-value">{inactiveGames}</p>
                  <p className="admin-metric-hint">Hidden from lobby</p>
                </div>
              </div>
            )}

            {error ? (
              <p className="rounded-xl border border-[var(--danger)]/35 bg-[var(--danger)]/10 px-4 py-3 text-sm font-semibold text-[#fecdd3]">
                {error}
              </p>
            ) : null}

            {tab === 'players' ? (
              <>
                <section className="admin-section">
                  <div className="admin-section-head">
                    <div>
                      <h2 className="admin-section-title">Create player</h2>
                      <p className="admin-section-subtitle">
                        New accounts can also register on the player app with 10,000 starting points.
                      </p>
                    </div>
                  </div>
                  <form onSubmit={onAddPlayer} className="admin-section-body">
                    <div className="admin-form-grid cols-2">
                      <label className="admin-field">
                        <span className="admin-field-label">Display name</span>
                        <input
                          placeholder="e.g. Millie"
                          className="admin-input"
                          value={playerForm.username}
                          onChange={(e) =>
                            setPlayerForm((f) => ({ ...f, username: e.target.value }))
                          }
                        />
                      </label>
                      <label className="admin-field">
                        <span className="admin-field-label">Phone number</span>
                        <input
                          required
                          placeholder="10-digit mobile"
                          inputMode="numeric"
                          maxLength={10}
                          className="admin-input"
                          value={playerForm.phone}
                          onChange={(e) =>
                            setPlayerForm((f) => ({ ...f, phone: e.target.value }))
                          }
                        />
                      </label>
                      <label className="admin-field">
                        <span className="admin-field-label">Password</span>
                        <input
                          required
                          type="password"
                          placeholder="Minimum 4 characters"
                          minLength={4}
                          className="admin-input"
                          value={playerForm.password}
                          onChange={(e) =>
                            setPlayerForm((f) => ({ ...f, password: e.target.value }))
                          }
                        />
                      </label>
                      <label className="admin-field">
                        <span className="admin-field-label">Starting balance</span>
                        <input
                          type="number"
                          min={0}
                          placeholder="10000"
                          className="admin-input"
                          value={playerForm.balance}
                          onChange={(e) =>
                            setPlayerForm((f) => ({ ...f, balance: e.target.value }))
                          }
                        />
                      </label>
                    </div>
                    <div className="admin-form-actions mt-4">
                      <button type="submit" disabled={busy} className="btn-game btn-play px-5 py-2.5 text-sm">
                        {busy ? 'Creating…' : 'Create player'}
                      </button>
                    </div>
                  </form>
                </section>

                <section className="admin-section">
                  <div className="admin-section-head">
                    <div>
                      <h2 className="admin-section-title">All players</h2>
                      <p className="admin-section-subtitle">
                        Search by name, phone, or player ID. Edit wallets or open history inline.
                      </p>
                    </div>
                    <span className="admin-count-badge">
                      {filteredPlayers.length} of {players.length}
                    </span>
                  </div>
                  <div className="admin-section-body flush">
                    <div className="border-b border-[var(--border)] px-4 py-3 sm:px-5">
                      <div className="admin-toolbar">
                        <div className="admin-search-wrap">
                          <IconSearch />
                          <input
                            type="search"
                            className="admin-search"
                            placeholder="Search players…"
                            value={playerSearch}
                            onChange={(e) => setPlayerSearch(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {!filteredPlayers.length ? (
                      <div className="admin-empty">
                        <div className="admin-empty-icon">
                          <IconPlayers />
                        </div>
                        <p className="admin-empty-title">
                          {players.length ? 'No matching players' : 'No players yet'}
                        </p>
                        <p className="admin-empty-text">
                          {players.length
                            ? 'Try a different search term or clear the filter.'
                            : 'Create your first player using the form above.'}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="player-list player-list-mobile">
                          {filteredPlayers.map((p) => {
                            const isEditing = editingWalletId === p.id
                            const draft =
                              walletDrafts[p.id] ?? String(Number(p.balance ?? 0))
                            return (
                              <div key={p.id} className="player-card">
                                <span className="player-avatar">{userInitials(p.username)}</span>
                                <div className="player-card-main">
                                  <p className="player-card-name">{p.username}</p>
                                  <div className="player-card-meta">
                                    {p.phone ? <span>+91 {p.phone}</span> : null}
                                    <span className="player-card-id" title={p.id}>
                                      {shortId(p.id)}
                                    </span>
                                  </div>
                                </div>
                                <div className="player-card-side">
                                  <PlayerWalletActions
                                    player={p}
                                    isEditing={isEditing}
                                    draft={draft}
                                    savingWalletId={savingWalletId}
                                    onStartEdit={startEditWallet}
                                    onSave={onSaveWallet}
                                    onCancel={cancelEditWallet}
                                    onHistory={openPlayerHistory}
                                    onDraftChange={(id, value) =>
                                      setWalletDrafts((prev) => ({ ...prev, [id]: value }))
                                    }
                                    compact
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        <div className="admin-table-desktop overflow-x-auto">
                          <table className="data-table min-w-full">
                            <thead>
                              <tr>
                                <th>Player</th>
                                <th>Phone</th>
                                <th>Player ID</th>
                                <th>Balance</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredPlayers.map((p) => {
                                const isEditing = editingWalletId === p.id
                                const draft =
                                  walletDrafts[p.id] ?? String(Number(p.balance ?? 0))
                                return (
                                  <tr key={p.id}>
                                    <td>
                                      <div className="flex items-center gap-3">
                                        <span className="player-avatar">{userInitials(p.username)}</span>
                                        <span className="font-semibold text-white">{p.username}</span>
                                      </div>
                                    </td>
                                    <td>{p.phone ? `+91 ${p.phone}` : '—'}</td>
                                    <td>
                                      <span
                                        className="font-mono text-xs text-[#d4d4d4]"
                                        title={p.id}
                                      >
                                        {shortId(p.id)}
                                      </span>
                                    </td>
                                    <td className="min-w-[11rem]">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          min={0}
                                          autoFocus
                                          className="admin-input text-xs player-balance-input"
                                          value={draft}
                                          onChange={(e) =>
                                            setWalletDrafts((prev) => ({
                                              ...prev,
                                              [p.id]: e.target.value,
                                            }))
                                          }
                                        />
                                      ) : (
                                        <span className="player-balance">
                                          <CurrencyAmount value={p.balance ?? 0} />
                                        </span>
                                      )}
                                    </td>
                                    <td>
                                      {isEditing ? (
                                        <div className="player-actions">
                                          <button
                                            type="button"
                                            disabled={savingWalletId === p.id}
                                            onClick={() => onSaveWallet(p)}
                                            className="btn-game btn-play btn-compact"
                                          >
                                            {savingWalletId === p.id ? 'Saving…' : 'Save'}
                                          </button>
                                          <button
                                            type="button"
                                            disabled={savingWalletId === p.id}
                                            onClick={cancelEditWallet}
                                            className="btn-game btn-ghost btn-compact"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="player-actions">
                                          <button
                                            type="button"
                                            onClick={() => startEditWallet(p)}
                                            className="btn-game btn-ghost btn-compact"
                                          >
                                            Edit wallet
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => openPlayerHistory(p)}
                                            className="btn-game btn-play btn-compact"
                                          >
                                            History
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                </section>
              </>
            ) : tab === 'games' ? (
              <>
                <section className="admin-section">
                  <div className="admin-section-head">
                    <div>
                      <h2 className="admin-section-title">Add game</h2>
                      <p className="admin-section-subtitle">
                        Platform opens the launch URL with userId, gameId, sessionId, token, and returnUrl.
                      </p>
                    </div>
                  </div>
                  <form onSubmit={onAddGame} className="admin-section-body">
                    <div className="admin-form-grid cols-3">
                      <label className="admin-field">
                        <span className="admin-field-label">Game name</span>
                        <input
                          required
                          placeholder="e.g. Ludo Classic"
                          className="admin-input"
                          value={gameForm.name}
                          onChange={(e) => setGameForm((f) => ({ ...f, name: e.target.value }))}
                        />
                      </label>
                      <label className="admin-field">
                        <span className="admin-field-label">Game ID</span>
                        <input
                          required
                          placeholder="e.g. LUDO"
                          className="admin-input"
                          value={gameForm.gameId}
                          onChange={(e) => setGameForm((f) => ({ ...f, gameId: e.target.value }))}
                        />
                      </label>
                      <label className="admin-field">
                        <span className="admin-field-label">Provider</span>
                        <input
                          required
                          placeholder="e.g. SPRING_LUDO"
                          className="admin-input"
                          value={gameForm.provider}
                          onChange={(e) => setGameForm((f) => ({ ...f, provider: e.target.value }))}
                        />
                      </label>
                      <label className="admin-field span-2">
                        <span className="admin-field-label">Launch URL</span>
                        <input
                          required
                          type="url"
                          placeholder="https://your-game.onrender.com/"
                          className="admin-input"
                          value={gameForm.launchUrl}
                          onChange={(e) =>
                            setGameForm((f) => ({ ...f, launchUrl: e.target.value }))
                          }
                        />
                      </label>
                      <label className="admin-field">
                        <span className="admin-field-label">Status</span>
                        <select
                          className="admin-input"
                          value={gameForm.status}
                          onChange={(e) => setGameForm((f) => ({ ...f, status: e.target.value }))}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </label>
                    </div>
                    <div className="admin-form-actions mt-4">
                      <button type="submit" disabled={busy} className="btn-game btn-play px-5 py-2.5 text-sm">
                        {busy ? 'Adding…' : 'Add game'}
                      </button>
                    </div>
                  </form>
                </section>

                <section className="admin-section">
                  <div className="admin-section-head">
                    <div>
                      <h2 className="admin-section-title">Game catalog</h2>
                      <p className="admin-section-subtitle">
                        Update launch URLs, toggle availability, or remove titles from the lobby.
                      </p>
                    </div>
                    <span className="admin-count-badge">
                      {filteredGames.length} of {games.length}
                    </span>
                  </div>
                  <div className="admin-section-body flush">
                    <div className="border-b border-[var(--border)] px-4 py-3 sm:px-5">
                      <div className="admin-toolbar">
                        <div className="admin-search-wrap">
                          <IconSearch />
                          <input
                            type="search"
                            className="admin-search"
                            placeholder="Search games…"
                            value={gameSearch}
                            onChange={(e) => setGameSearch(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {!filteredGames.length ? (
                      <div className="admin-empty">
                        <div className="admin-empty-icon">
                          <IconGames />
                        </div>
                        <p className="admin-empty-title">
                          {games.length ? 'No matching games' : 'No games yet'}
                        </p>
                        <p className="admin-empty-text">
                          {games.length
                            ? 'Try a different search term or clear the filter.'
                            : 'Add your first game using the form above.'}
                        </p>
                      </div>
                    ) : (
                      <div className="game-grid">
                        {filteredGames.map((g) => {
                          const isActive = g.status === 'active' || g.isActive
                          const draft = urlDrafts[g.gameId] ?? ''
                          const dirty = draft !== (g.launchUrl || '')
                          return (
                            <article key={g._id || g.gameId} className="game-card">
                              <div className="game-card-head">
                                <div className="min-w-0">
                                  <h3 className="game-card-title">{g.title || g.name}</h3>
                                </div>
                                <span className={`status-pill ${isActive ? 'active' : 'inactive'}`}>
                                  {isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <dl className="game-card-meta">
                                <div className="game-meta-row">
                                  <dt>Game ID</dt>
                                  <dd className="mono">{g.gameId}</dd>
                                </div>
                                <div className="game-meta-row">
                                  <dt>Provider</dt>
                                  <dd>{g.provider || '—'}</dd>
                                </div>
                              </dl>
                              <div className="game-url-block">
                                <span className="game-url-label">Launch URL</span>
                                <input
                                  className="admin-input text-xs"
                                  value={draft}
                                  placeholder="https://…"
                                  onChange={(e) =>
                                    setUrlDrafts((prev) => ({
                                      ...prev,
                                      [g.gameId]: e.target.value,
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  disabled={savingUrlId === g.gameId || !dirty}
                                  onClick={() => onSaveLaunchUrl(g)}
                                  className="btn-game btn-play btn-compact w-fit"
                                >
                                  {savingUrlId === g.gameId ? 'Saving…' : 'Save URL'}
                                </button>
                              </div>
                              <div className="game-card-actions">
                                <button
                                  type="button"
                                  onClick={() => onToggle(g)}
                                  className="btn-game btn-ghost btn-compact"
                                >
                                  {isActive ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteGame(g)}
                                  className="btn-game btn-danger btn-compact"
                                >
                                  Delete
                                </button>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </section>
              </>
            ) : null}
          </div>
        </main>
      </div>

      {historyPlayer ? (
        <PlayerHistoryModal
          player={historyPlayer}
          history={playerHistory}
          loading={historyLoading}
          onClose={closePlayerHistory}
        />
      ) : null}
    </div>
  )
}

export default function App() {
  const [admin, setAdminState] = useState(() => getAdmin())

  if (!admin) {
    return <Login onLogin={setAdminState} />
  }

  return (
    <Dashboard
      admin={admin}
      onLogout={() => {
        setAdmin(null)
        setAdminState(null)
      }}
    />
  )
}
