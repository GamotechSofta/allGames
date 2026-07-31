import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { fetchGames, launchGame } from '../api'

const GAME_STYLES = {
  LUDO: {
    accent: 'from-amber-500/30 to-orange-600/10',
    badge: 'bg-amber-400 text-amber-950',
    button: 'bg-amber-400 text-amber-950 hover:bg-amber-300',
  },
  TEENPATTI: {
    accent: 'from-rose-500/30 to-fuchsia-700/10',
    badge: 'bg-rose-400 text-rose-950',
    button: 'bg-rose-400 text-rose-950 hover:bg-rose-300',
  },
}

export default function Home() {
  const { user, loading, logout, refreshBalance } = useAuth()
  const [games, setGames] = useState([])
  const [error, setError] = useState('')
  const [launching, setLaunching] = useState('')

  useEffect(() => {
    if (!user) return
    fetchGames()
      .then((res) => setGames(res.data || []))
      .catch((err) => setError(err.message))
    refreshBalance().catch(() => {})
  }, [user, refreshBalance])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-950 text-slate-300">
        Loading…
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  async function onPlay(gameCode) {
    setError('')
    setLaunching(gameCode)
    try {
      await refreshBalance()
      const res = await launchGame(gameCode)
      window.location.assign(res.launchUrl)
    } catch (err) {
      setError(err.message || 'Could not launch game')
      setLaunching('')
    }
  }

  return (
    <div className="min-h-svh bg-[radial-gradient(ellipse_at_top,#1e293b,#0b1220)] text-white">
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-6">
        <div>
          <p className="text-sm font-medium tracking-wide text-emerald-400">AllGames</p>
          <h1 className="text-xl font-semibold">Welcome, {user.username}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm">
            <p className="text-slate-400">Player ID</p>
            <p className="font-mono text-emerald-300">{user.id || user.playerId}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm">
            <p className="text-slate-400">Wallet</p>
            <p className="font-semibold text-amber-300">
              ₹{Number(user.balance ?? 0).toLocaleString('en-IN')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => refreshBalance().catch(() => {})}
            className="rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold">Play now</h2>
          <p className="mt-1 text-slate-400">
            Logged-in players launch with their player ID, token, and wallet balance.
          </p>
        </div>

        {error ? (
          <p className="mb-6 rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300">{error}</p>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          {games.map((game) => {
            const style = GAME_STYLES[game.gameCode] || GAME_STYLES.LUDO
            const busy = launching === game.gameCode
            return (
              <article
                key={game.gameCode}
                className={`overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${style.accent} p-6`}
              >
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
                  {game.gameCode}
                </span>
                <h3 className="mt-4 text-2xl font-semibold">{game.name}</h3>
                <p className="mt-2 text-sm text-slate-300">{game.description}</p>
                <button
                  type="button"
                  disabled={Boolean(launching)}
                  onClick={() => onPlay(game.gameCode)}
                  className={`mt-6 w-full rounded-xl py-2.5 font-semibold transition disabled:opacity-60 ${style.button}`}
                >
                  {busy ? 'Launching…' : 'Play'}
                </button>
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}
