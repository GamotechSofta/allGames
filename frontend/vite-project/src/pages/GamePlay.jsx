import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

const SESSION_EXPIRED_RE =
  /login|session[_-]?expired|token[_-]?expired|unauthorized|\/401\b/i

export default function GamePlay() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const iframeRef = useRef(null)
  const historyDepth = useRef(0)
  const [blocked, setBlocked] = useState('')

  const launchUrl = location.state?.launchUrl || ''
  const gameName = location.state?.gameName || 'Game'
  const sessionId = location.state?.sessionId || ''

  const canPlay = Boolean(user && launchUrl)

  const forceRelogin = useCallback(() => {
    logout()
    navigate('/login', { replace: true, state: { reason: 'session_expired' } })
  }, [logout, navigate])

  useEffect(() => {
    if (!launchUrl) return
    if (SESSION_EXPIRED_RE.test(launchUrl)) {
      forceRelogin()
    }
  }, [launchUrl, forceRelogin])

  const iframeSrc = useMemo(() => launchUrl, [launchUrl])

  function onBack() {
    try {
      const win = iframeRef.current?.contentWindow
      if (win && historyDepth.current > 0) {
        win.history.back()
        historyDepth.current -= 1
        return
      }
    } catch {
      // cross-origin: cannot inspect iframe history
    }
    navigate('/', { replace: true })
  }

  function onIframeLoad() {
    historyDepth.current += 1
    try {
      const href = iframeRef.current?.contentWindow?.location?.href || ''
      if (href && SESSION_EXPIRED_RE.test(href)) {
        setBlocked('Session expired')
        forceRelogin()
      }
    } catch {
      // ignore cross-origin access errors
    }
  }

  if (!user) return <Navigate to="/login" replace />
  if (!canPlay) return <Navigate to="/" replace />

  return (
    <div className="flex h-svh flex-col bg-slate-950 text-white">
      <header className="flex items-center gap-3 border-b border-white/10 px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5"
        >
          Back
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{gameName}</p>
          {sessionId ? (
            <p className="truncate font-mono text-xs text-slate-400">{sessionId}</p>
          ) : null}
        </div>
      </header>

      {blocked ? (
        <div className="flex flex-1 items-center justify-center text-rose-300">{blocked}</div>
      ) : (
        <iframe
          ref={iframeRef}
          title={gameName}
          src={iframeSrc}
          className="h-full w-full flex-1 border-0 bg-black"
          allow="autoplay; fullscreen; payment; clipboard-read; clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={onIframeLoad}
        />
      )}
    </div>
  )
}
