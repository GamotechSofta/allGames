import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(phone, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-[radial-gradient(ellipse_at_top,#1e293b,#0f172a)] px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur"
      >
        <div>
          <p className="text-sm font-medium tracking-wide text-emerald-400">AllGames</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Player login</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to play Ludo & Teen Patti</p>
        </div>

        {error ? (
          <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-300">{error}</p>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-sm text-slate-300">Phone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="numeric"
            maxLength={10}
            required
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-emerald-500/40 focus:ring-2"
            placeholder="10-digit phone"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-slate-300">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none ring-emerald-500/40 focus:ring-2"
            placeholder="Password"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-emerald-500 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-center text-sm text-slate-400">
          New here?{' '}
          <Link to="/register" className="text-emerald-400 hover:underline">
            Create account
          </Link>
        </p>
      </form>
    </div>
  )
}
