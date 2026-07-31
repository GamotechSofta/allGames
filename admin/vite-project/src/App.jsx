import { useEffect, useState } from 'react'
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
    <div className="flex min-h-svh items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-slate-900/80 p-8"
      >
        <h1 className="text-2xl font-semibold text-white">Admin login</h1>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <input
          className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
        />
        <input
          type="password"
          className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-emerald-500 py-2.5 font-semibold text-slate-950"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

function Dashboard({ admin, onLogout }) {
  const [tab, setTab] = useState('players')
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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-emerald-400">AllGames Admin</p>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400">Logged in as {admin.username}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('players')}
            className={`rounded-xl px-3 py-2 text-sm ${
              tab === 'players' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10'
            }`}
          >
            Players
          </button>
          <button
            type="button"
            onClick={() => setTab('games')}
            className={`rounded-xl px-3 py-2 text-sm ${
              tab === 'games' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10'
            }`}
          >
            Games
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      {error ? (
        <p className="mb-4 rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300">{error}</p>
      ) : null}

      {tab === 'players' ? (
        <>
          <form
            onSubmit={onAddPlayer}
            className="mb-8 grid gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:grid-cols-2"
          >
            <h2 className="sm:col-span-2 text-lg font-medium text-white">Create player</h2>
            <p className="sm:col-span-2 text-sm text-slate-400">
              Players sign in on the frontend with this phone + password. No public signup.
            </p>
            <input
              placeholder="Display name"
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
              value={playerForm.username}
              onChange={(e) => setPlayerForm((f) => ({ ...f, username: e.target.value }))}
            />
            <input
              required
              placeholder="10-digit phone"
              inputMode="numeric"
              maxLength={10}
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
              value={playerForm.phone}
              onChange={(e) => setPlayerForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <input
              required
              type="password"
              placeholder="Password (min 4)"
              minLength={4}
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
              value={playerForm.password}
              onChange={(e) => setPlayerForm((f) => ({ ...f, password: e.target.value }))}
            />
            <input
              type="number"
              min={0}
              placeholder="Starting balance"
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
              value={playerForm.balance}
              onChange={(e) => setPlayerForm((f) => ({ ...f, balance: e.target.value }))}
            />
            <button
              type="submit"
              disabled={busy}
              className="sm:col-span-2 rounded-xl bg-emerald-500 py-2.5 font-semibold text-slate-950"
            >
              {busy ? 'Saving…' : 'Create player'}
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-300">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Player ID</th>
                  <th className="px-4 py-3">Balance</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} className="border-t border-white/5">
                    <td className="px-4 py-3 text-white">{p.username}</td>
                    <td className="px-4 py-3">{p.phone}</td>
                    <td className="px-4 py-3 font-mono text-xs text-emerald-300">{p.id}</td>
                    <td className="px-4 py-3 text-amber-300">
                      ₹{Number(p.balance ?? 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
                {!players.length ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
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
          <form
            onSubmit={onAddGame}
            className="mb-8 grid gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:grid-cols-2"
          >
            <h2 className="sm:col-span-2 text-lg font-medium text-white">Add game</h2>
            <input
              required
              placeholder="Name"
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
              value={gameForm.name}
              onChange={(e) => setGameForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              required
              placeholder="Provider gameId"
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
              value={gameForm.gameId}
              onChange={(e) => setGameForm((f) => ({ ...f, gameId: e.target.value }))}
            />
            <input
              required
              placeholder="Provider"
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
              value={gameForm.provider}
              onChange={(e) => setGameForm((f) => ({ ...f, provider: e.target.value }))}
            />
            <input
              placeholder="Image URL (optional)"
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
              value={gameForm.image}
              onChange={(e) => setGameForm((f) => ({ ...f, image: e.target.value }))}
            />
            <button
              type="submit"
              disabled={busy}
              className="sm:col-span-2 rounded-xl bg-emerald-500 py-2.5 font-semibold text-slate-950"
            >
              {busy ? 'Saving…' : 'Add game'}
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-300">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">gameId</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => (
                  <tr key={g._id} className="border-t border-white/5">
                    <td className="px-4 py-3 text-white">{g.title || g.name}</td>
                    <td className="px-4 py-3 font-mono text-emerald-300">{g.gameId}</td>
                    <td className="px-4 py-3">{g.provider}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          g.status === 'active' ? 'text-emerald-400' : 'text-slate-400'
                        }
                      >
                        {g.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onToggle(g)}
                        className="rounded-lg border border-white/15 px-3 py-1.5 hover:bg-white/5"
                      >
                        Toggle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
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
