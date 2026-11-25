import { useEffect, useMemo, useState } from 'react'
import {
  addPlayer,
  adminLogin,
  getAdmin,
  listPlayers,
  setAdmin,
  updatePlayerWallet,
  togglePlayerSuspension,
  fetchPlayerHistory,
  listHeroBanners,
  addHeroBanner,
  updateHeroBanner,
  toggleHeroBanner,
  deleteHeroBanner,
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

function IconBanners() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 15l4.5-4.5a2 2 0 0 1 2.8 0L16 16" />
      <path d="M14 14l1.5-1.5a2 2 0 0 1 2.8 0L21 15" />
      <circle cx="8.5" cy="9" r="1.2" />
    </svg>
  )
}

const EMPTY_BANNER_FORM = {
  deviceType: 'desktop',
  title: '',
  subtitle: '',
  pill: '',
  image: '',
  mobileImage: '',
  ctaLabel: '',
  ctaUrl: '',
  sortOrder: '0',
  status: 'active',
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

function PlayerHistoryModal({ player, history, loading, onClose }) {
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
              {player.phone ? `+91 ${player.phone}` : shortId(player.id)} · Wallet activity
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
          {loading ? (
            <p className="py-12 text-center text-sm font-semibold text-[var(--muted)]">
              Loading history…
            </p>
          ) : !history.length ? (
            <p className="py-12 text-center text-sm font-semibold text-[var(--muted)]">
              No wallet transactions yet for this player.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table min-w-full">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Details</th>
                    <th>Amount</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => {
                    const type = historyKind(row)
                    const isDebit = type === 'DEBIT'
                    const isCredit = type === 'CREDIT'
                    const label = isDebit ? 'DEBIT' : isCredit ? 'CREDIT' : type || 'TX'
                    return (
                      <tr key={`${label}-${row.id}`}>
                        <td>
                          <span className={`status-pill ${isDebit ? 'inactive' : 'active'}`}>
                            {label}
                          </span>
                        </td>
                        <td className="text-xs text-[var(--muted)]">
                          {shortId(row.transactionId || row.roundId || row.gameId)}
                          {row.rolledBack ? ' · rolled back' : ''}
                        </td>
                        <td className="font-display font-bold">
                          <span className={isDebit ? 'text-[#fda4af]' : 'text-[var(--lime)]'}>
                            {isDebit ? '−' : '+'}₹
                            {Math.abs(Number(row.amount) || 0).toLocaleString('en-IN')}
                          </span>
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
          Manage players and wallets
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

function PlayerWalletActions({
  player,
  isEditing,
  draft,
  savingWalletId,
  suspendingPlayerId,
  onStartEdit,
  onSave,
  onCancel,
  onHistory,
  onToggleSuspension,
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
          <div className="player-actions flex-wrap gap-1.5">
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
            <button
              type="button"
              disabled={suspendingPlayerId === player.id}
              onClick={() => onToggleSuspension(player)}
              className={`btn-game btn-compact ${player.isSuspended ? 'btn-play' : 'btn-danger'}`}
              title={player.isSuspended ? 'Reactivate player account' : 'Suspend player and prevent login'}
            >
              {suspendingPlayerId === player.id
                ? 'Saving…'
                : player.isSuspended
                  ? 'Unsuspend'
                  : 'Suspend'}
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
  const [players, setPlayers] = useState([])
  const [banners, setBanners] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [savingWalletId, setSavingWalletId] = useState('')
  const [suspendingPlayerId, setSuspendingPlayerId] = useState('')
  const [editingWalletId, setEditingWalletId] = useState('')
  const [historyPlayer, setHistoryPlayer] = useState(null)
  const [playerHistory, setPlayerHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [walletDrafts, setWalletDrafts] = useState({})
  const [playerSearch, setPlayerSearch] = useState('')
  const [refreshing, setRefreshing] = useState('')
  const [bannerForm, setBannerForm] = useState(EMPTY_BANNER_FORM)
  const [editingBannerId, setEditingBannerId] = useState('')
  const [bannerFilter, setBannerFilter] = useState('all')
  const [playerForm, setPlayerForm] = useState({
    username: '',
    phone: '',
    password: '',
    balance: '10000',
  })

  const totalBalance = useMemo(
    () => players.reduce((sum, p) => sum + (Number(p.balance) || 0), 0),
    [players],
  )
  const activePlayers = useMemo(
    () => players.filter((p) => !p.isSuspended).length,
    [players],
  )
  const topPlayers = useMemo(
    () =>
      [...players]
        .sort((a, b) => Number(b.balance ?? 0) - Number(a.balance ?? 0))
        .slice(0, 4),
    [players],
  )

  const activeBanners = useMemo(
    () => banners.filter((b) => b.status === 'active' || b.isActive).length,
    [banners],
  )
  const desktopBannersCount = useMemo(
    () => banners.filter((b) => (b.deviceType || 'desktop') === 'desktop').length,
    [banners],
  )
  const mobileBannersCount = useMemo(
    () => banners.filter((b) => b.deviceType === 'mobile').length,
    [banners],
  )
  const filteredBanners = useMemo(() => {
    if (bannerFilter === 'all') return banners
    return banners.filter((b) => (b.deviceType || 'desktop') === bannerFilter)
  }, [banners, bannerFilter])

  const pageMeta = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Platform overview — players, wallets, and hero banners.',
    },
    players: {
      title: 'Players',
      subtitle: 'Manage player accounts, adjust wallets, and review activity.',
    },
    banners: {
      title: 'Hero Banners',
      subtitle: 'Create and manage lobby hero banners shown on the player home screen.',
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

  async function refreshTabData() {
    setRefreshing(tab)
    setError('')
    try {
      if (tab === 'banners') {
        await refreshBanners()
      } else if (tab === 'dashboard') {
        await Promise.all([refreshPlayers(), refreshBanners()])
      } else {
        await refreshPlayers()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setRefreshing('')
    }
  }

  async function refreshPlayers() {
    const res = await listPlayers()
    setPlayers(res.data || [])
  }

  async function refreshBanners() {
    const res = await listHeroBanners()
    setBanners(res.data || [])
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
    Promise.all([refreshPlayers(), refreshBanners()]).catch((err) => setError(err.message))
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
    setEditingBannerId('')
    setBannerForm(EMPTY_BANNER_FORM)
    setHistoryPlayer(null)
    setPlayerHistory([])
  }

  function startEditBanner(banner) {
    const deviceType = banner.deviceType === 'mobile' ? 'mobile' : 'desktop'
    setEditingBannerId(banner._id)
    setBannerForm({
      deviceType,
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      pill: banner.pill || '',
      image: banner.image || banner.mobileImage || '',
      mobileImage: deviceType === 'mobile' ? banner.image || banner.mobileImage || '' : '',
      ctaLabel: banner.ctaLabel || '',
      ctaUrl: banner.ctaUrl || '',
      sortOrder: String(banner.sortOrder ?? 0),
      status: banner.status === 'inactive' ? 'inactive' : 'active',
    })
    setError('')
  }

  async function onSaveBanner(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const deviceType = bannerForm.deviceType === 'mobile' ? 'mobile' : 'desktop'
      const payload = {
        ...bannerForm,
        deviceType,
        mobileImage: deviceType === 'mobile' ? bannerForm.image : '',
        sortOrder: Number(bannerForm.sortOrder) || 0,
      }
      if (editingBannerId) {
        await updateHeroBanner(editingBannerId, payload)
      } else {
        await addHeroBanner(payload)
      }
      setBannerForm({ ...EMPTY_BANNER_FORM, deviceType })
      setEditingBannerId('')
      await refreshBanners()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function onToggleBanner(banner) {
    setError('')
    try {
      await toggleHeroBanner(banner._id)
      await refreshBanners()
    } catch (err) {
      setError(err.message)
    }
  }

  async function onDeleteBanner(banner) {
    if (!window.confirm(`Delete banner “${banner.title}”? This cannot be undone.`)) return
    setError('')
    try {
      await deleteHeroBanner(banner._id)
      if (editingBannerId === banner._id) {
        setEditingBannerId('')
        setBannerForm(EMPTY_BANNER_FORM)
      }
      await refreshBanners()
    } catch (err) {
      setError(err.message)
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

  async function onToggleSuspension(player) {
    const isCurrentlySuspended = Boolean(player.isSuspended)
    const action = isCurrentlySuspended ? 'unsuspend' : 'suspend'
    if (
      !window.confirm(
        isCurrentlySuspended
          ? `Reactivate player “${player.username}”? They will be allowed to log in.`
          : `Suspend player “${player.username}”? They will NOT be able to log in.`,
      )
    ) {
      return
    }

    setError('')
    setSuspendingPlayerId(player.id)
    try {
      const res = await togglePlayerSuspension({
        playerId: player.id,
        isSuspended: !isCurrentlySuspended,
      })
      const nextSuspended = res.data?.isSuspended ?? !isCurrentlySuspended
      setPlayers((prev) =>
        prev.map((p) => (p.id === player.id ? { ...p, isSuspended: nextSuspended } : p)),
      )
    } catch (err) {
      setError(err.message || `Failed to ${action} player`)
    } finally {
      setSuspendingPlayerId('')
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
            className={`nav-item ${tab === 'banners' ? 'is-active' : ''}`}
            onClick={() => selectTab('banners')}
          >
            <IconBanners />
            Banners
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
                    <p className="admin-metric-hint">Not suspended</p>
                  </div>
                  <div className="admin-metric">
                    <p className="admin-metric-label">Hero banners</p>
                    <p className="admin-metric-value">{banners.length}</p>
                    <p className="admin-metric-hint">{activeBanners} live in lobby</p>
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
                    onClick={() => selectTab('banners')}
                    className="dashboard-quick-card"
                  >
                    <span className="dashboard-quick-icon">
                      <IconBanners />
                    </span>
                    <span className="dashboard-quick-text">
                      <span className="dashboard-quick-title">Manage banners</span>
                      <span className="dashboard-quick-desc">
                        {activeBanners} active · {banners.length} total
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
                </div>
              </>
            ) : tab === 'banners' ? (
              <div className="admin-metrics">
                <div className="admin-metric">
                  <p className="admin-metric-label">Total banners</p>
                  <p className="admin-metric-value">{banners.length}</p>
                  <p className="admin-metric-hint">{activeBanners} active in lobby</p>
                </div>
                <div className="admin-metric">
                  <p className="admin-metric-label">Desktop banners</p>
                  <p className="admin-metric-value is-gold">{desktopBannersCount}</p>
                  <p className="admin-metric-hint">Shown on desktop (&gt;768px)</p>
                </div>
                <div className="admin-metric">
                  <p className="admin-metric-label">Mobile banners</p>
                  <p className="admin-metric-value is-green">{mobileBannersCount}</p>
                  <p className="admin-metric-hint">Shown on mobile (≤768px)</p>
                </div>
              </div>
            ) : (
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
                  <p className="admin-metric-hint">Not suspended</p>
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
                                  <div className="flex items-center gap-2">
                                    <p className="player-card-name">{p.username}</p>
                                    {p.isSuspended ? (
                                      <span className="px-1.5 py-0.5 text-[0.6rem] font-bold uppercase rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                        Suspended
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 text-[0.6rem] font-bold uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        Active
                                      </span>
                                    )}
                                  </div>
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
                                    suspendingPlayerId={suspendingPlayerId}
                                    onStartEdit={startEditWallet}
                                    onSave={onSaveWallet}
                                    onCancel={cancelEditWallet}
                                    onHistory={openPlayerHistory}
                                    onToggleSuspension={onToggleSuspension}
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
                                <th>Status</th>
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
                                    <td>
                                      {p.isSuspended ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                          Suspended
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                          Active
                                        </span>
                                      )}
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
                                        <div className="player-actions flex-wrap gap-1.5">
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
                                          <button
                                            type="button"
                                            disabled={suspendingPlayerId === p.id}
                                            onClick={() => onToggleSuspension(p)}
                                            className={`btn-game btn-compact ${p.isSuspended ? 'btn-play' : 'btn-danger'}`}
                                            title={p.isSuspended ? 'Reactivate player and allow login' : 'Suspend player and prevent login'}
                                          >
                                            {suspendingPlayerId === p.id
                                              ? 'Saving…'
                                              : p.isSuspended
                                                ? 'Unsuspend'
                                                : 'Suspend'}
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
            ) : tab === 'banners' ? (
              <>
                <section className="admin-section">
                  <div className="admin-section-head">
                    <div>
                      <h2 className="admin-section-title">
                        {editingBannerId ? 'Edit banner' : 'Add banner'}
                      </h2>
                      <p className="admin-section-subtitle">
                        Banners appear in the player lobby hero carousel. Use image URLs (https).
                      </p>
                    </div>
                  </div>
                  <form onSubmit={onSaveBanner} className="admin-section-body">
                    <div className="mb-4">
                      <span className="admin-field-label block mb-2">
                        1. Select banner type (Desktop or Mobile)
                      </span>
                      <div
                        role="radiogroup"
                        aria-label="Banner device type"
                        className="flex flex-wrap gap-2"
                      >
                        <button
                          type="button"
                          role="radio"
                          aria-checked={bannerForm.deviceType === 'desktop'}
                          onClick={() =>
                            setBannerForm((f) => ({ ...f, deviceType: 'desktop' }))
                          }
                          className={`btn-game px-4 py-2 text-sm ${
                            bannerForm.deviceType === 'desktop' ? 'btn-play' : 'btn-ghost'
                          }`}
                        >
                          Desktop Banner
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={bannerForm.deviceType === 'mobile'}
                          onClick={() =>
                            setBannerForm((f) => ({ ...f, deviceType: 'mobile' }))
                          }
                          className={`btn-game px-4 py-2 text-sm ${
                            bannerForm.deviceType === 'mobile' ? 'btn-play' : 'btn-ghost'
                          }`}
                        >
                          Mobile Banner
                        </button>
                      </div>
                    </div>

                    <div className="admin-form-grid cols-3">
                      <label className="admin-field">
                        <span className="admin-field-label">Title</span>
                        <input
                          required
                          placeholder="e.g. Welcome Bonus"
                          className="admin-input"
                          value={bannerForm.title}
                          onChange={(e) =>
                            setBannerForm((f) => ({ ...f, title: e.target.value }))
                          }
                        />
                      </label>
                      <label className="admin-field">
                        <span className="admin-field-label">Sort order</span>
                        <input
                          type="number"
                          className="admin-input"
                          value={bannerForm.sortOrder}
                          onChange={(e) =>
                            setBannerForm((f) => ({ ...f, sortOrder: e.target.value }))
                          }
                        />
                      </label>
                      <label className="admin-field">
                        <span className="admin-field-label">Status</span>
                        <select
                          className="admin-input"
                          value={bannerForm.status}
                          onChange={(e) =>
                            setBannerForm((f) => ({ ...f, status: e.target.value }))
                          }
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </label>
                      <label className="admin-field span-2">
                        <span className="admin-field-label">
                          {bannerForm.deviceType === 'mobile'
                            ? 'Mobile image URL'
                            : 'Desktop image URL'}
                        </span>
                        <input
                          required
                          type="url"
                          placeholder="https://…"
                          className="admin-input"
                          value={bannerForm.image}
                          onChange={(e) =>
                            setBannerForm((f) => ({ ...f, image: e.target.value }))
                          }
                        />
                      </label>
                      <label className="admin-field">
                        <span className="admin-field-label">Click / CTA URL (optional)</span>
                        <input
                          type="url"
                          placeholder="https://…"
                          className="admin-input"
                          value={bannerForm.ctaUrl}
                          onChange={(e) =>
                            setBannerForm((f) => ({ ...f, ctaUrl: e.target.value }))
                          }
                        />
                      </label>
                    </div>
                    <div className="admin-form-actions mt-4 flex flex-wrap gap-2">
                      <button type="submit" disabled={busy} className="btn-game btn-play px-5 py-2.5 text-sm">
                        {busy
                          ? 'Saving…'
                          : editingBannerId
                            ? `Update ${bannerForm.deviceType} banner`
                            : `Add ${bannerForm.deviceType} banner`}
                      </button>
                      {editingBannerId ? (
                        <button
                          type="button"
                          className="btn-game btn-ghost px-5 py-2.5 text-sm"
                          onClick={() => {
                            setEditingBannerId('')
                            setBannerForm(EMPTY_BANNER_FORM)
                          }}
                        >
                          Cancel edit
                        </button>
                      ) : null}
                    </div>
                  </form>
                </section>

                <section className="admin-section">
                  <div className="admin-section-head">
                    <div>
                      <h2 className="admin-section-title">Banner catalog</h2>
                      <p className="admin-section-subtitle">
                        Filter by Desktop or Mobile, toggle visibility, edit, or delete banners.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBannerFilter('all')}
                        className={`btn-game btn-compact ${bannerFilter === 'all' ? 'btn-play' : 'btn-ghost'}`}
                      >
                        All ({banners.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBannerFilter('desktop')}
                        className={`btn-game btn-compact ${bannerFilter === 'desktop' ? 'btn-play' : 'btn-ghost'}`}
                      >
                        Desktop ({desktopBannersCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBannerFilter('mobile')}
                        className={`btn-game btn-compact ${bannerFilter === 'mobile' ? 'btn-play' : 'btn-ghost'}`}
                      >
                        Mobile ({mobileBannersCount})
                      </button>
                    </div>
                  </div>
                  <div className="admin-section-body flush">
                    {!filteredBanners.length ? (
                      <div className="admin-empty">
                        <div className="admin-empty-icon">
                          <IconBanners />
                        </div>
                        <p className="admin-empty-title">
                          {bannerFilter === 'all'
                            ? 'No banners yet'
                            : `No ${bannerFilter} banners yet`}
                        </p>
                        <p className="admin-empty-text">
                          Select {bannerFilter === 'mobile' ? 'Mobile' : 'Desktop'} Banner above to add one.
                        </p>
                      </div>
                    ) : (
                      <div className="game-grid" style={{ padding: '1rem', display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                        {filteredBanners.map((b) => {
                          const isActive = b.status === 'active' || b.isActive
                          const deviceType = b.deviceType === 'mobile' ? 'mobile' : 'desktop'
                          const previewUrl = b.image || b.mobileImage
                          return (
                            <article key={b._id} className="game-card" style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--panel)' }}>
                              <div style={{ background: '#111' }}>
                                {previewUrl ? (
                                  <img
                                    src={previewUrl}
                                    alt={b.title}
                                    style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
                                  />
                                ) : null}
                              </div>
                              <div style={{ padding: '0.9rem 1rem', display: 'grid', gap: '0.55rem' }}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h3 className="font-display text-sm font-bold text-white truncate">
                                      {b.title}
                                    </h3>
                                    <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-amber-300 mt-0.5">
                                      {deviceType === 'mobile' ? 'Mobile Banner' : 'Desktop Banner'}
                                    </p>
                                  </div>
                                  <span className={`status-pill ${isActive ? 'active' : 'inactive'}`}>
                                    {isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <p className="text-[0.65rem] text-[var(--muted)]">
                                  Order {b.sortOrder ?? 0}
                                </p>
                                <div className="player-actions flex-wrap gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => startEditBanner(b)}
                                    className="btn-game btn-ghost btn-compact"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onToggleBanner(b)}
                                    className="btn-game btn-play btn-compact"
                                  >
                                    {isActive ? 'Disable' : 'Enable'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteBanner(b)}
                                    className="btn-game btn-danger btn-compact"
                                  >
                                    Delete
                                  </button>
                                </div>
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
