import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { fetchGames, launchGame } from '../api'

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

  useEffect(() => {
    if (!user) return undefined
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
  }, [user, refreshBalance])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-950 text-slate-300">
        Loading…
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

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

      // Always open once in the same tab (no window.open / no second navigation)
      window.location.assign(url)
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
          <h2 className="text-2xl font-semibold">Casino games</h2>
          <p className="mt-1 text-slate-400">
            Tap a game to play (opens in this tab).
          </p>
        </div>

        {error ? (
          <p className="mb-6 rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300">{error}</p>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => {
            const id = game.gameId
            const busy = launching === id
            return (
              <article
                key={game._id || id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-950 p-5"
              >
                {game.image ? (
                  <img
                    src={game.image}
                    alt=""
                    className="mb-4 h-36 w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="mb-4 flex h-36 items-center justify-center rounded-xl bg-slate-800 text-slate-500">
                    {game.provider || 'GAP'}
                  </div>
                )}
                <span className="inline-flex rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                  {game.provider}
                </span>
                <h3 className="mt-3 text-xl font-semibold">{game.title || game.name}</h3>
                <p className="mt-1 font-mono text-xs text-slate-400">{id}</p>
                <button
                  type="button"
                  disabled={Boolean(launching)}
                  onClick={() => onPlay(game)}
                  className="mt-5 w-full rounded-xl bg-emerald-500 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                >
                  {busy ? 'Launching…' : 'Play'}
                </button>
              </article>
            )
          })}
        </div>

        {!games.length && !error ? (
          <p className="mt-8 text-center text-slate-400">
            No active games yet. Add games from the admin panel (port 5175).
          </p>
        ) : null}
      </main>
    </div>
  )
}
