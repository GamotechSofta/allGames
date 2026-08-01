import { useEffect, useMemo, useState } from 'react'
import {
  addGame,
  addPlayer,
  adminLogin,
  getAdmin,
  listGames,
  listPlayers,
  setAdmin,
  toggleGame,
} from './api'
import siteLogo from './assets/image.png'

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

function shortId(id) {
  const s = String(id || '')
  if (s.length <= 10) return s
  return `${s.slice(0, 6)}…${s.slice(-4)}`
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
            <p className="font-display text-[0.7rem] font-bold tracking-[0.3em] text-[var(--lime)]">
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

function Dashboard({ admin, onLogout }) {
  const [tab, setTab] = useState('players')
  const [menuOpen, setMenuOpen] = useState(false)
  const [games, setGames] = useState([])
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [gameForm, setGameForm] = useState({
    name: '',
    gameId: '',
    provider: 'GAP',
    status: 'active',
    image: '',
  })
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
    () => players.reduce((sum, p) => sum + Number(p.balance ?? 0), 0),
    [players],
  )

  async function refreshGames() {
    const res = await listGames()
    setGames(res.data || [])
  }

  async function refreshPlayers() {
    const res = await listPlayers()
    setPlayers(res.data || [])
  }

  useEffect(() => {
    Promise.all([refreshGames(), refreshPlayers()]).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!menuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  function selectTab(next) {
    setTab(next)
    setMenuOpen(false)
    setError('')
  }

  async function onAddGame(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await addGame(gameForm)
      setGameForm({ name: '', gameId: '', provider: 'GAP', status: 'active', image: '' })
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

  return (
    <div className={`admin-shell dash ${menuOpen ? 'menu-open' : ''}`}>
      <button
        type="button"
        className="nav-backdrop"
        aria-label="Close menu"
        onClick={() => setMenuOpen(false)}
      />

      <aside className="dash-sidebar">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
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
            <p className="mt-1 font-display text-sm font-bold text-[var(--gold)]">
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

        <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-display text-[0.65rem] font-bold tracking-[0.22em] text-[var(--lime)]">
                CONTROL CENTER
              </p>
              <h1 className="font-display mt-1 text-2xl font-extrabold tracking-wide sm:text-3xl">
                {tab === 'players' ? 'Players' : 'Games'}
              </h1>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-card">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                Players
              </p>
              <p className="font-display mt-1 text-2xl font-extrabold">{players.length}</p>
            </div>
            <div className="stat-card">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                Active games
              </p>
              <p className="font-display mt-1 text-2xl font-extrabold text-[var(--lime)]">
                {activeGames}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                Total wallet
              </p>
              <p className="font-display mt-1 text-2xl font-extrabold text-[var(--gold)]">
                ₹{totalBalance.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-[var(--danger)]/35 bg-[var(--danger)]/10 px-4 py-3 text-sm font-semibold text-[#fecdd3]">
              {error}
            </p>
          ) : null}

          {tab === 'players' ? (
            <>
              <form onSubmit={onAddPlayer} className="panel-card grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <h2 className="font-display text-lg font-bold tracking-wide">Create player</h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                    New accounts can also sign up on the frontend with 10,000 starting points.
                  </p>
                </div>
                <input
                  placeholder="Display name"
                  className="admin-input"
                  value={playerForm.username}
                  onChange={(e) => setPlayerForm((f) => ({ ...f, username: e.target.value }))}
                />
                <input
                  required
                  placeholder="10-digit phone"
                  inputMode="numeric"
                  maxLength={10}
                  className="admin-input"
                  value={playerForm.phone}
                  onChange={(e) => setPlayerForm((f) => ({ ...f, phone: e.target.value }))}
                />
                <input
                  required
                  type="password"
                  placeholder="Password (min 4)"
                  minLength={4}
                  className="admin-input"
                  value={playerForm.password}
                  onChange={(e) => setPlayerForm((f) => ({ ...f, password: e.target.value }))}
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Starting balance"
                  className="admin-input"
                  value={playerForm.balance}
                  onChange={(e) => setPlayerForm((f) => ({ ...f, balance: e.target.value }))}
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-game btn-play sm:col-span-2 py-3 text-sm"
                >
                  {busy ? 'Saving…' : 'Create player'}
                </button>
              </form>

              <div className="panel-card overflow-x-auto !p-0">
                <table className="data-table min-w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Player ID</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p) => (
                      <tr key={p.id}>
                        <td className="font-semibold text-white">{p.username}</td>
                        <td>{p.phone}</td>
                        <td>
                          <span className="font-mono text-xs text-[var(--lime)]" title={p.id}>
                            {shortId(p.id)}
                          </span>
                        </td>
                        <td className="font-display font-bold text-[var(--gold)]">
                          ₹{Number(p.balance ?? 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                    {!players.length ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-[var(--muted)]">
                          No players yet. Create one above.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <form onSubmit={onAddGame} className="panel-card grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <h2 className="font-display text-lg font-bold tracking-wide">Add game</h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                    Add catalog games and toggle them live for the player lobby.
                  </p>
                </div>
                <input
                  required
                  placeholder="Name"
                  className="admin-input"
                  value={gameForm.name}
                  onChange={(e) => setGameForm((f) => ({ ...f, name: e.target.value }))}
                />
                <input
                  required
                  placeholder="Provider gameId"
                  className="admin-input"
                  value={gameForm.gameId}
                  onChange={(e) => setGameForm((f) => ({ ...f, gameId: e.target.value }))}
                />
                <input
                  required
                  placeholder="Provider"
                  className="admin-input"
                  value={gameForm.provider}
                  onChange={(e) => setGameForm((f) => ({ ...f, provider: e.target.value }))}
                />
                <input
                  placeholder="Image URL (optional)"
                  className="admin-input"
                  value={gameForm.image}
                  onChange={(e) => setGameForm((f) => ({ ...f, image: e.target.value }))}
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-game btn-play sm:col-span-2 py-3 text-sm"
                >
                  {busy ? 'Saving…' : 'Add game'}
                </button>
              </form>

              <div className="panel-card overflow-x-auto !p-0">
                <table className="data-table min-w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>gameId</th>
                      <th>Provider</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games.map((g) => (
                      <tr key={g._id}>
                        <td className="font-semibold text-white">{g.title || g.name}</td>
                        <td className="font-mono text-xs text-[var(--lime)]">{g.gameId}</td>
                        <td>{g.provider}</td>
                        <td>
                          <span
                            className={`status-pill ${
                              g.status === 'active' ? 'active' : 'inactive'
                            }`}
                          >
                            {g.status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => onToggle(g)}
                            className="btn-game btn-ghost px-3 py-1.5 text-[0.58rem]"
                          >
                            Toggle
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!games.length ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-[var(--muted)]">
                          No games yet. Add one above.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
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
