import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import siteLogo from '../assets/image.png'

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
    <div className="auth-shell">
      <form onSubmit={onSubmit} className="auth-panel space-y-5">
        <div className="flex items-center gap-3">
          <img src={siteLogo} alt="AllGames" className="site-logo" />
          <div>
            <p className="font-display text-[0.7rem] font-bold tracking-[0.35em] text-[var(--lime)]">
              ALLGAMES
            </p>
            <h1 className="font-display mt-1 text-2xl font-bold tracking-wide">Player Login</h1>
          </div>
        </div>
        <p className="text-sm font-semibold text-[var(--muted)]">
          Enter the arena with your phone and password
        </p>

        {error ? (
          <p className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm font-semibold text-[#fecdd3]">
            {error}
          </p>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
            Phone
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="numeric"
            maxLength={10}
            required
            className="auth-input"
            placeholder="10-digit phone"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="auth-input"
            placeholder="Password"
          />
        </label>

        <button type="submit" disabled={busy} className="btn-game btn-play w-full py-3 text-sm">
          {busy ? 'Signing in…' : 'Enter Lobby'}
        </button>

        <p className="text-center text-sm font-semibold text-[var(--muted)]">
          New here?{' '}
          <Link to="/register" className="text-[var(--lime)] hover:underline">
            Create account
          </Link>
        </p>
      </form>
    </div>
  )
}
