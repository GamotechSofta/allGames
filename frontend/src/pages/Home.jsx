import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { fetchGames, fetchGameHistory, launchGame, creditWallet } from '../api'
import siteLogo from '../assets/image.png'

/** Public CDN images (Unsplash / Microsoft CDN) for lobby art */
const IMAGES = {
  teenpatti: 'https://images.unsplash.com/photo-1541278107931-e006523892df?auto=format&fit=crop&w=1200&q=80',
  ludo: 'https://store-images.s-microsoft.com/image/apps.38011.13964317340864868.4c21ecf1-2804-40c6-bd9e-a2efd241f30b.7fb161ca-d8f2-4e3a-9f2b-4992fa436cd1?q=90&w=1200&h=600',
  bonus: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=1200&q=80',
  jackpot: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=1200&q=80',
  defaultGame: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
}

const LIVE_WINNERS = [
  { name: 'Rohit K.', game: 'Teen Patti', amount: 18500, time: 'Just now' },
  { name: 'Sneha P.', game: 'PotLudo', amount: 6200, time: '2m ago' },
  { name: 'Vikram M.', game: 'Teen Patti', amount: 32000, time: '5m ago' },
  { name: 'Ankit D.', game: 'PotLudo', amount: 9500, time: '8m ago' },
  { name: 'Pooja R.', game: 'Teen Patti', amount: 14200, time: '11m ago' },
  { name: 'Karan S.', game: 'PotLudo', amount: 8000, time: '16m ago' },
  { name: 'VIP #4092', game: 'Teen Patti', amount: 50000, time: '20m ago' },
]

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

function userInitials(name) {
  const parts = String(name || 'Player').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return String(name || 'PL').slice(0, 2).toUpperCase()
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

/* Crisp SVG Icons */
function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  )
}

function IconGames() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function IconHistory() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12a8 8 0 1 0 2.3-5.7" />
      <path d="M4 5v4h4" />
      <path d="M12 8v5l3 2" />
    </svg>
  )
}

function IconProfile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.5-3.2 4-4.5 7-4.5s5.5 1.3 7 4.5" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 7V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-2" />
      <path d="M15 12H3m0 0 3-3m-3 3 3 3" />
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



function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}



function IconRefresh({ spinning }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spinning ? 'animate-spin' : ''}
    >
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="2" x2="6" y2="10" />
      <line x1="2" y1="6" x2="10" y2="6" />
    </svg>
  )
}

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconGift() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

const NAV = [
  { id: 'lobby', label: 'Home Lobby', Icon: IconHome },
  { id: 'games', label: 'All Games', Icon: IconGames },
  { id: 'history', label: 'Play History', Icon: IconHistory },
  { id: 'wallet', label: 'VIP Profile', Icon: IconProfile },
]

export default function Home() {
  const { user, loading, logout, refreshBalance } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const [tab, setTab] = useState(() => {
    const fromState = location.state?.tab
    const fromQuery = new URLSearchParams(window.location.search).get('tab')
    const fromStore = sessionStorage.getItem('allgames_tab')
    const allowed = ['lobby', 'games', 'history', 'wallet']
    if (allowed.includes(fromState)) return fromState
    if (allowed.includes(fromQuery)) return fromQuery
    if (allowed.includes(fromStore)) return fromStore
    return 'lobby'
  })

  const [menuOpen, setMenuOpen] = useState(false)
  const [games, setGames] = useState([])
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyView, setHistoryView] = useState('game')
  const [error, setError] = useState('')
  const [launching, setLaunching] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Interactive controls state
  const [currentBanner, setCurrentBanner] = useState(0)
  const [bannerPaused, setBannerPaused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [depositOpen, setDepositOpen] = useState(false)
  const [depositAmount, setDepositAmount] = useState(500)
  const [depositLoading, setDepositLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const searchInputRef = useRef(null)

  // Favorites state
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem('allgames_favs')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // Daily streak state
  const [dailyClaimed, setDailyClaimed] = useState(() => {
    try {
      const today = new Date().toDateString()
      return localStorage.getItem('allgames_streak_date') === today
    } catch {
      return false
    }
  })

  // Progressive jackpot tick simulation
  const [jackpotPool, setJackpotPool] = useState(2485620)

  const userId = user?.id || user?.playerId

  useEffect(() => {
    sessionStorage.setItem('allgames_tab', tab)
  }, [tab])

  // Restore Games tab when returning from play
  useEffect(() => {
    const applyReturnTab = () => {
      const fromQuery = new URLSearchParams(window.location.search).get('tab')
      const fromStore = sessionStorage.getItem('allgames_tab')
      if (fromQuery === 'games' || fromStore === 'games') {
        setTab('games')
      }
      refreshBalance().catch(() => { })
    }

    applyReturnTab()
    window.addEventListener('pageshow', applyReturnTab)
    window.addEventListener('focus', applyReturnTab)
    return () => {
      window.removeEventListener('pageshow', applyReturnTab)
      window.removeEventListener('focus', applyReturnTab)
    }
  }, [refreshBalance])

  useEffect(() => {
    const fromState = location.state?.tab
    const fromQuery = searchParams.get('tab')
    const allowed = ['lobby', 'games', 'history', 'wallet']
    if (allowed.includes(fromState)) {
      setTab(fromState)
      navigate(location.pathname, { replace: true, state: {} })
      return
    }
    if (allowed.includes(fromQuery)) {
      setTab(fromQuery)
      const next = new URLSearchParams(searchParams)
      next.delete('tab')
      setSearchParams(next, { replace: true })
    }
  }, [location.state, location.pathname, searchParams, navigate, setSearchParams])

  // Save favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('allgames_favs', JSON.stringify(favorites))
    } catch {
      /* ignore */
    }
  }, [favorites])

  // Jackpot live ticking animation
  useEffect(() => {
    const interval = setInterval(() => {
      setJackpotPool((prev) => prev + Math.floor(Math.random() * 25) + 5)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  // Auto-slide hero banners every 6 seconds unless paused
  useEffect(() => {
    if (bannerPaused) return
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % 4)
    }, 6000)
    return () => clearInterval(timer)
  }, [bannerPaused])

  // Keyboard shortcut Ctrl+K or / to focus search
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function showToast(msg) {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage('')
    }, 3500)
  }

  function toggleFavorite(gameId) {
    setFavorites((prev) => {
      const isFav = prev.includes(gameId)
      const next = isFav ? prev.filter((id) => id !== gameId) : [...prev, gameId]
      showToast(isFav ? 'Removed from favorites' : '⭐ Added to favorites!')
      return next
    })
  }

  async function handleClaimDailyStreak() {
    if (dailyClaimed) return
    try {
      await creditWallet(100, { remarks: 'Daily streak reward' })
      const today = new Date().toDateString()
      localStorage.setItem('allgames_streak_date', today)
      setDailyClaimed(true)
      await refreshBalance()
      showToast('🎁 Day 3 Streak Claimed! ₹100 Added to Wallet!')
    } catch (err) {
      showToast(err.message || 'Could not claim daily reward')
    }
  }

  async function handleDepositSubmit(e) {
    e?.preventDefault()
    const amt = Number(depositAmount)
    if (!amt || amt <= 0) return
    setDepositLoading(true)
    try {
      await creditWallet(amt, { remarks: 'Player quick topup' })
      await refreshBalance()
      const historyRes = await fetchGameHistory(60)
      setHistory(historyRes.data?.feed || historyRes.data?.transactions || [])
      setDepositOpen(false)
      showToast(`🎉 ₹${amt.toLocaleString('en-IN')} added to your wallet!`)
    } catch (err) {
      showToast(err.message || 'Deposit failed')
    } finally {
      setDepositLoading(false)
    }
  }

  function copyText(text, label = 'Copied') {
    if (!text) return
    navigator.clipboard?.writeText(String(text)).then(() => {
      setCopiedId(text)
      showToast(`${label} copied to clipboard!`)
      setTimeout(() => setCopiedId(''), 2000)
    })
  }

  const moneyHistory = useMemo(() => history.filter(isWalletHistoryRow), [history])
  const gameHistory = useMemo(() => history.filter(isLaunchHistoryRow), [history])
  const visibleHistory = historyView === 'game' ? gameHistory : moneyHistory

  const recent = useMemo(() => moneyHistory.slice(0, 4), [moneyHistory])
  const recentActivity = useMemo(() => gameHistory.slice(0, 5), [gameHistory])

  // Filtered and sorted games
  const filteredGames = useMemo(() => {
    let result = [...games]

    // Category filter
    if (activeCategory === 'favs') {
      result = result.filter((g) => favorites.includes(g.gameId || g.gameCode))
    } else if (activeCategory === 'cards') {
      result = result.filter((g) => {
        const k = String(g.gameId || g.title || g.name || '').toLowerCase()
        return k.includes('teen') || k.includes('patti') || k.includes('card') || k.includes('poker')
      })
    } else if (activeCategory === 'board') {
      result = result.filter((g) => {
        const k = String(g.gameId || g.title || g.name || '').toLowerCase()
        return k.includes('ludo') || k.includes('dice') || k.includes('pot')
      })
    } else if (activeCategory === 'hot') {
      result = result.slice(0, 6)
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((g) => {
        const title = String(g.title || g.name || '').toLowerCase()
        const id = String(g.gameId || '').toLowerCase()
        const prov = String(g.provider || '').toLowerCase()
        return title.includes(q) || id.includes(q) || prov.includes(q)
      })
    }

    return result
  }, [games, activeCategory, searchQuery, favorites])

  useEffect(() => {
    if (!userId) return
    fetchGames()
      .then((res) => setGames(res.data || []))
      .catch((err) => setError(err.message))
    refreshBalance().catch(() => { })
    fetchGameHistory(40)
      .then((res) => setHistory(res.data?.feed || res.data?.transactions || []))
      .catch(() => { })
  }, [userId, refreshBalance])

  useEffect(() => {
    if (!userId || tab !== 'history') return
    let cancelled = false
    setHistoryLoading(true)
    fetchGameHistory(60)
      .then((res) => {
        if (!cancelled) setHistory(res.data?.feed || res.data?.transactions || [])
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
      refreshBalance().catch(() => { })
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

  useEffect(() => {
    if (!menuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
          <p className="font-display text-sm tracking-[0.2em] text-[var(--gold)]">LOADING CASINO LOBBY…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  async function onRefresh() {
    setRefreshing(true)
    setError('')
    try {
      await refreshBalance()
      const [gamesRes, historyRes] = await Promise.all([fetchGames(), fetchGameHistory(60)])
      setGames(gamesRes.data || [])
      setHistory(historyRes.data?.feed || historyRes.data?.transactions || [])
      showToast('Wallet balance refreshed!')
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
      sessionStorage.setItem('allgames_tab', 'games')
      setTab('games')

      const playSession = {
        launchUrl: url,
        gameName: game.title || game.name || gameId,
        sessionId: res.sessionId || '',
        returnTab: 'games',
        openMode: 'iframe',
        provider: res.provider || game.provider || '',
      }
      try {
        sessionStorage.setItem('allgames_play_session', JSON.stringify(playSession))
      } catch {
        /* ignore */
      }
      navigate('/play', { state: playSession })
      setLaunching('')
    } catch (err) {
      setError(err.message || 'Could not launch game')
      setLaunching('')
    }
  }

  function selectTab(id) {
    setError('')
    setTab(id)
    setMenuOpen(false)
  }

  // Find featured games for banners
  const teenPattiGame = games.find((g) => {
    const k = String(g.gameId || g.title || g.name || '').toLowerCase()
    return k.includes('teen') || k.includes('patti')
  }) || games[0]

  const ludoGame = games.find((g) => {
    const k = String(g.gameId || g.title || g.name || '').toLowerCase()
    return k.includes('ludo') || k.includes('pot')
  }) || games[1] || games[0]

  const HERO_BANNERS = [
    {
      id: 0,
      pill: '🔥 LIVE TOURNAMENT • 50X MULTIPLIER',
      pillClass: 'hero-pill-fire',
      title: 'Teen Patti Royal Deluxe',
      desc: 'Experience India’s premier multiplayer card arena. Certified RNG, high-stakes private tables, and lightning withdrawals.',
      image: IMAGES.teenpatti,
      stats: [
        { label: '1,480 Active Players', color: '#86efac' },
        { label: '⭐ 4.9 Rating', color: '#fbbf24' },
        { label: 'Stakes: ₹10 – ₹50,000', color: '#e5e7eb' },
      ],
      primaryLabel: 'Play Teen Patti',
      primaryAction: () => (teenPattiGame ? onPlay(teenPattiGame) : selectTab('games')),
      secondaryLabel: 'Explore Card Games',
      secondaryAction: () => {
        setActiveCategory('cards')
        selectTab('games')
      },
    },
    {
      id: 1,
      pill: '🎲 INSTANT MULTIPLAYER • ₹1,00,000 PRIZE POOL',
      pillClass: 'hero-pill-emerald',
      title: 'PotLudo Championship Arena',
      desc: 'Roll the dice, knock opponents out, and sprint your tokens home! Compete 1-on-1 or join 4-player high reward tables.',
      image: IMAGES.ludo,
      stats: [
        { label: '920 Playing Now', color: '#86efac' },
        { label: '5-Minute Fast Match', color: '#60a5fa' },
        { label: 'Instant Cash Drops', color: '#fbbf24' },
      ],
      primaryLabel: 'Play PotLudo 🎲',
      primaryAction: () => (ludoGame ? onPlay(ludoGame) : selectTab('games')),
      secondaryLabel: 'How to Play',
      secondaryAction: () => selectTab('games'),
    },
    {
      id: 2,
      pill: '👑 VIP RECHARGE • 100% MATCH BOOST',
      pillClass: 'hero-pill-gold',
      title: '100% Deposit Bonus + 5% Daily Rebate',
      desc: 'Top up your wallet today to unlock elite high-roller tables, VIP tier progress, and zero-fee instant settlements.',
      image: IMAGES.bonus,
      stats: [
        { label: 'Up to ₹5,000 Match', color: '#fbbf24' },
        { label: 'Zero Fee UPI', color: '#86efac' },
        { label: '100% Safe & Secure', color: '#e5e7eb' },
      ],
      primaryLabel: 'Add Cash & Claim Bonus +',
      primaryAction: () => setDepositOpen(true),
      secondaryLabel: 'View VIP Tiers',
      secondaryAction: () => selectTab('wallet'),
    },
    {
      id: 3,
      pill: '💰 PROGRESSIVE MEGA JACKPOT • ACTIVE',
      pillClass: 'hero-pill-violet',
      title: `Mega Jackpot: ₹${jackpotPool.toLocaleString('en-IN')}`,
      desc: 'Every game played builds the grand vault pool. Any lucky winning hand can trigger the life-changing grand jackpot!',
      image: IMAGES.jackpot,
      stats: [
        { label: 'Live Pool Counting', color: '#c4b5fd' },
        { label: '🏆 Last Win: ₹4,20,000', color: '#86efac' },
        { label: 'Dropping Today', color: '#fca5a5' },
      ],
      primaryLabel: 'Spin & Win Jackpot',
      primaryAction: () => (teenPattiGame ? onPlay(teenPattiGame) : selectTab('games')),
      secondaryLabel: 'View Statement',
      secondaryAction: () => selectTab('history'),
    },
  ]

  const activeBanner = HERO_BANNERS[currentBanner]

  function renderHeroSection() {
    return (
      <section
        className="hero-carousel-container"
        onMouseEnter={() => setBannerPaused(true)}
        onMouseLeave={() => setBannerPaused(false)}
        aria-label="Promotions and Featured Games"
      >
        <div
          className="hero-slide"
          style={{ backgroundImage: `url(${activeBanner.image})` }}
        >
          <div className="hero-slide-overlay" />
          <div className="hero-slide-content">
            <span className={`hero-pill ${activeBanner.pillClass}`}>
              {activeBanner.pill}
            </span>
            <h2 className="hero-title">{activeBanner.title}</h2>
            <p className="hero-desc">{activeBanner.desc}</p>

            <div className="hero-stats-row">
              {activeBanner.stats.map((st, i) => (
                <div key={i} className="hero-stat-item">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.color }} />
                  <span style={{ color: st.color }}>{st.label}</span>
                </div>
              ))}
            </div>

            <div className="hero-actions-row">
              <button
                type="button"
                className="btn-hero-play"
                onClick={activeBanner.primaryAction}
              >
                {/* <IconZap /> */}
                <span>{activeBanner.primaryLabel}</span>
              </button>
              <button
                type="button"
                className="btn-hero-alt"
                onClick={activeBanner.secondaryAction}
              >
                <span>{activeBanner.secondaryLabel}</span>
              </button>
            </div>
          </div>

          {/* Nav Arrows */}
          <button
            type="button"
            className="hero-nav-btn hero-nav-prev"
            aria-label="Previous slide"
            onClick={() => setCurrentBanner((prev) => (prev === 0 ? HERO_BANNERS.length - 1 : prev - 1))}
          >
            <IconChevronLeft />
          </button>
          <button
            type="button"
            className="hero-nav-btn hero-nav-next"
            aria-label="Next slide"
            onClick={() => setCurrentBanner((prev) => (prev + 1) % HERO_BANNERS.length)}
          >
            <IconChevronRight />
          </button>

          {/* Dots Indicator */}
          <div className="hero-dots-bar">
            {HERO_BANNERS.map((b, idx) => (
              <button
                key={b.id}
                type="button"
                aria-label={`Slide ${idx + 1}`}
                className={`hero-dot ${idx === currentBanner ? 'is-active' : ''}`}
                onClick={() => setCurrentBanner(idx)}
              />
            ))}
          </div>
        </div>
      </section>
    )
  }

  function renderWinnersMarquee() {
    return (
      <div className="marquee-container" aria-label="Recent Live Winners">

        <div className="marquee-track">
          {[...LIVE_WINNERS, ...LIVE_WINNERS].map((win, i) => (
            <div key={i} className="marquee-item">
              <span>👤</span>
              <strong>{win.name}</strong>
              <span>won</span>
              <span className="marquee-amount">₹{win.amount.toLocaleString('en-IN')}</span>
              <span>in {win.game}</span>
              <span className="text-[var(--muted)] text-xs">({win.time})</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderLobbyControls() {
    return (
      <div className="lobby-controls-bar">
        <div className="category-pills-list" role="tablist" aria-label="Game Categories">
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === 'all'}
            className={`cat-pill ${activeCategory === 'all' ? 'is-active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            <span>🔥 All Games</span>
            <span className="cat-count">{games.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === 'hot'}
            className={`cat-pill ${activeCategory === 'hot' ? 'is-active' : ''}`}
            onClick={() => setActiveCategory('hot')}
          >
            <span>👑 Hot & Trending</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === 'cards'}
            className={`cat-pill ${activeCategory === 'cards' ? 'is-active' : ''}`}
            onClick={() => setActiveCategory('cards')}
          >
            <span>♠️ Card Games</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === 'board'}
            className={`cat-pill ${activeCategory === 'board' ? 'is-active' : ''}`}
            onClick={() => setActiveCategory('board')}
          >
            <span>🎲 Board & Dice</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === 'favs'}
            className={`cat-pill ${activeCategory === 'favs' ? 'is-active' : ''}`}
            onClick={() => setActiveCategory('favs')}
          >
            <span>⭐ Favorites</span>
            <span className="cat-count">{favorites.length}</span>
          </button>
        </div>

        <div className="search-input-wrap">
          <span className="search-icon-left">
            <IconSearch />
          </span>
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search games (Press /)..."
          />
          {searchQuery ? (
            <button
              type="button"
              className="search-clear-btn"
              aria-label="Clear search"
              onClick={() => setSearchQuery('')}
            >
              <IconClose />
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  function renderGameCards() {
    return (
      <>
        <div className="game-grid grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {filteredGames.map((game, index) => {
            const id = game.gameId || game.gameCode
            const busy = launching === id
            const title = game.title || game.name || id
            const tag = gameTag(game, index)
            const isFav = favorites.includes(id)
            const provider = game.provider || 'GAP EXCLUSIVE'

            return (
              <article key={game._id || id} className="game-card group">
                <button
                  type="button"
                  className={`game-card-fav-btn ${isFav ? 'is-fav' : ''}`}
                  aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(id)
                  }}
                >
                </button>

                <div className="game-card-art">
                  <img src={gameImage(game)} alt={title} loading="lazy" />
                  <span className={`tag ${tag.className}`}>{tag.label}</span>
                  <div className="absolute bottom-3 left-3 z-[1] right-3">
                    <span className="text-[0.62rem] font-bold uppercase tracking-wider text-amber-300 drop-shadow">
                      {provider}
                    </span>
                    <h4 className="font-display text-lg sm:text-xl font-extrabold tracking-wide drop-shadow truncate">
                      {title}
                    </h4>
                  </div>
                </div>

                <div className="game-card-meta-row">
                  <div className="game-card-meta-live">
                    <span className="game-card-meta-dot" />
                    <span>{1200 + index * 340} playing</span>
                  </div>
                  <span className="text-amber-400 font-bold">⭐ 4.9</span>
                </div>

                <div className="px-3 sm:px-4 pb-3.5 pt-1">
                  <button
                    type="button"
                    disabled={Boolean(launching)}
                    onClick={() => onPlay(game)}
                    className="btn-game btn-play w-full py-2.5 text-xs font-bold tracking-wider"
                  >
                    {busy ? (
                      <span className="inline-flex items-center gap-1.5">
                        <IconRefresh spinning={true} />
                        <span>Launching…</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">

                        <span>Play Now</span>
                      </span>
                    )}
                  </button>
                </div>
              </article>
            )
          })}
        </div>

        {!filteredGames.length ? (
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center">
            <p className="font-display text-base font-bold tracking-wide text-white">
              {searchQuery ? `No games matching "${searchQuery}"` : 'NO GAMES IN THIS CATEGORY'}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {activeCategory === 'favs'
                ? 'Star games using the icon on any game card to see them here.'
                : 'Try clearing your search filters to explore all available titles.'}
            </p>
            {(searchQuery || activeCategory !== 'all') ? (
              <button
                type="button"
                className="btn-game btn-purple mt-4 px-4 py-2 text-xs"
                onClick={() => {
                  setSearchQuery('')
                  setActiveCategory('all')
                }}
              >
                Reset Filters
              </button>
            ) : null}
          </div>
        ) : null}
      </>
    )
  }

  function renderDepositModal() {
    if (!depositOpen) return null
    return (
      <div className="modal-backdrop-layer" onClick={() => setDepositOpen(false)}>
        <div className="deposit-modal-card" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="modal-close-icon-btn"
            aria-label="Close modal"
            onClick={() => setDepositOpen(false)}
          >
            <IconClose />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-full bg-amber-400/20 text-amber-400 grid place-items-center">
              <IconCoin />
            </span>
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-widest text-amber-400">Instant Cashier</p>
              <h3 className="font-display text-xl font-extrabold text-white">Add Cash to Wallet</h3>
            </div>
          </div>
          <p className="text-xs text-[var(--muted)] mb-3">
            Select a quick recharge chip or type a custom amount to play instantly.
          </p>

          <div className="chip-presets-grid">
            {[200, 500, 1000, 2500, 5000, 10000].map((amt) => (
              <button
                key={amt}
                type="button"
                className={`chip-preset-btn ${Number(depositAmount) === amt ? 'is-selected' : ''}`}
                onClick={() => setDepositAmount(amt)}
              >
                <span>₹{amt.toLocaleString('en-IN')}</span>
                <span className="chip-preset-bonus">+{amt >= 1000 ? '10% Bonus' : '5% Bonus'}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleDepositSubmit}>
            <div className="deposit-input-row">
              <span className="deposit-input-currency">₹</span>
              <input
                type="number"
                min="50"
                step="50"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="deposit-text-input"
                placeholder="Enter amount"
                required
              />
            </div>

            <div className="space-y-2">
              <button
                type="submit"
                disabled={depositLoading || !Number(depositAmount)}
                className="btn-hero-play w-full py-3.5 text-center text-sm"
              >
                {depositLoading ? 'Adding Funds…' : `Confirm & Add ₹${Number(depositAmount || 0).toLocaleString('en-IN')}`}
              </button>
              <p className="text-[0.68rem] text-center text-[var(--muted)] flex items-center justify-center gap-1">
                <IconCheck /> 100% Secure Instant Settlement • Zero Fees
              </p>
            </div>
          </form>
        </div>
      </div>
    )
  }

  const showLobby = tab === 'lobby'
  const showGamesOnly = tab === 'games'
  const showHistory = tab === 'history'
  const showWallet = tab === 'wallet'

  return (
    <div className={`dash text-[var(--text)] ${menuOpen ? 'menu-open' : ''}`}>
      {/* Toast Notification */}
      {toastMessage ? (
        <div className="toast-bubble" role="status">
          <span className="text-amber-400">✨</span>
          <span>{toastMessage}</span>
        </div>
      ) : null}

      {/* Quick Deposit Modal */}
      {renderDepositModal()}

      <button
        type="button"
        className="nav-backdrop"
        aria-label="Close menu"
        onClick={() => setMenuOpen(false)}
      />

      {/* Main Sidebar */}
      <aside className="dash-sidebar">
        <button
          type="button"
          className="menu-close-btn"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        >
          <IconClose />
        </button>

        <div className="dash-brand">
          <img src={siteLogo} alt="AllGames" className="site-logo" />
          <div>
            <p className="dash-brand-title">ALLGAMES</p>
            <span className="text-[0.62rem] font-bold uppercase tracking-wider text-amber-400">VIP Casino</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`nav-item ${tab === id ? 'is-active' : ''}`}
              onClick={() => selectTab(id)}
            >
              <Icon />
              <span className="nav-item-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-divider" />

          {/* Interactive VIP Status Card */}
          <div className="vip-club-card">
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-400">VIP Club</span>
              <span className="text-[0.68rem] font-bold text-white">Tier 3 (Gold)</span>
            </div>
            <div className="vip-progress-track">
              <div className="vip-progress-fill" style={{ width: '74%' }} />
            </div>
            <div className="flex items-center justify-between text-[0.65rem] text-[var(--muted)]">
              <span>74% to Platinum</span>
              <span>+5% Rebate</span>
            </div>
            <button
              type="button"
              disabled={dailyClaimed}
              className="streak-claim-btn"
              onClick={handleClaimDailyStreak}
            >
              <IconGift />
              <span>{dailyClaimed ? 'Day 3 Claimed ✓' : 'Claim Daily Streak (₹100)'}</span>
            </button>
          </div>

          <button
            type="button"
            className="sidebar-support-btn border border-orange-600"
            onClick={() => {
              setMenuOpen(false)
              logout()
            }}
          >
            <span className="sidebar-support-left">
              <IconLogout />
              <span>Sign Out</span>
            </span>
            <span className="sidebar-badge">Exit</span>
          </button>
        </div>
      </aside>

      {/* Content Area */}
      <div className="dash-content">
        {/* Mobile Topbar */}
        <div className="mobile-topbar">
          <div className="flex items-center gap-2 min-w-0">
            <img src={siteLogo} alt="AllGames" className="site-logo site-logo-sm" />
            <p className="dash-brand-title truncate">ALLGAMES</p>
          </div>
          <div className="mobile-topbar-right">
            <button
              type="button"
              onClick={() => setDepositOpen(true)}
              className="btn-game btn-play px-2.5 py-1 text-[0.6rem] font-bold"
            >
              + Add
            </button>
            <div className="chip chip-compact">
              <span className="chip-icon gold">
                <IconCoin />
              </span>
              <p className="font-display text-[0.7rem] font-bold tracking-wide text-[var(--gold)]">
                ₹{Number(user.balance ?? 0).toLocaleString('en-IN')}
              </p>
            </div>
            <button
              type="button"
              className="hamburger-btn"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <IconMenu />
            </button>
          </div>
        </div>

        {/* Desktop Header */}
        <header className="dash-header">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[0.7rem] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>2,480 Players Live</span>
            </div>
            <div className="hidden lg:flex items-center gap-1.5 text-[0.7rem] text-[var(--muted)]">
              <span className="text-amber-400">🛡️</span>
              <span>100% Fair Play Verified</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={() => setDepositOpen(true)}
              className="btn-hero-play px-2 py-2 text-sm"
            >

              <span className='text-sm'>Add Cash </span>
            </button>

            <div className="chip header-wallet-chip">
              <span className="chip-icon gold">
                <IconCoin />
              </span>
              <div className="leading-tight">
                <p className="text-[0.55rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                  Wallet
                </p>
                <p className="font-display text-xs font-bold tracking-wide text-[var(--gold)]">
                  ₹{Number(user.balance ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh Balance"
              className="btn-game btn-purple p-2.5"
            >
              <IconRefresh spinning={refreshing} />
            </button>

            <button
              type="button"
              onClick={() => selectTab('wallet')}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:border-amber-400/40 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black font-extrabold text-[0.7rem] grid place-items-center">
                {userInitials(user.username)}
              </div>
              <span className="text-[0.7rem] font-bold text-white max-w-[5.5rem] truncate">
                {user.username || 'Player'}
              </span>
            </button>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className={`dash-body ${showGamesOnly || showHistory || showWallet ? 'dash-body-single' : ''}`}>
          <section className="min-w-0 space-y-4">
            {error ? (
              <p className="rounded-xl border border-[var(--danger)]/35 bg-[var(--danger)]/10 px-4 py-3 text-sm font-semibold text-[#fecdd3]">
                {error}
              </p>
            ) : null}

            {/* HOME LOBBY TAB */}
            {showLobby ? (
              <>
                {/* 1. Dynamic Hero Banners */}
                {renderHeroSection()}

                {/* 2. Live Winners Ticker */}
                {renderWinnersMarquee()}

                {/* 3. Category & Search Bar */}
                {renderLobbyControls()}

                {/* 4. Supercharged Game Grid */}
                {renderGameCards()}
              </>
            ) : null}

            {/* ALL GAMES TAB */}
            {showGamesOnly ? (
              <>
                <div className="mb-2">
                  <h2 className="font-display text-2xl font-bold tracking-wide">All Casino Games</h2>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Browse the complete catalog of live card, board, and multiplier tables.
                  </p>
                </div>
                {renderLobbyControls()}
                {renderGameCards()}
              </>
            ) : null}

            {/* PLAY HISTORY TAB */}
            {showHistory ? (
              <div>
                <div className="mb-4">
                  <h2 className="font-display text-2xl font-bold tracking-[0.06em]">Transaction & Game History</h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                    {historyView === 'game'
                      ? 'Detailed records of game sessions launched from the lobby'
                      : 'Complete statement of wallet debits, credits, and winnings'}
                  </p>
                </div>

                {/* Summary Stat Counters */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3.5 rounded-xl border border-white/10 bg-[var(--panel)]">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Sessions Launched</p>
                    <p className="font-display text-xl font-bold text-white mt-1">{gameHistory.length}</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-white/10 bg-[var(--panel)]">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Total Credits/Wins</p>
                    <p className="font-display text-xl font-bold text-emerald-400 mt-1">
                      ₹{moneyHistory
                        .filter((r) => ['CREDIT', 'WIN'].includes(historyKind(r)))
                        .reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
                        .toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-white/10 bg-[var(--panel)]">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Wallet Balance</p>
                    <p className="font-display text-xl font-bold text-amber-400 mt-1">
                      ₹{Number(user.balance ?? 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="history-tabs" role="tablist" aria-label="History type">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={historyView === 'game'}
                    className={`history-tab ${historyView === 'game' ? 'is-active' : ''}`}
                    onClick={() => setHistoryView('game')}
                  >
                    <span>Game Sessions</span>
                    <span className="history-tab-count">{gameHistory.length}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={historyView === 'wallet'}
                    className={`history-tab ${historyView === 'wallet' ? 'is-active' : ''}`}
                    onClick={() => setHistoryView('wallet')}
                  >
                    <span>Wallet Transactions</span>
                    <span className="history-tab-count">{moneyHistory.length}</span>
                  </button>
                </div>

                <div className="history-panel">
                  {historyLoading ? (
                    <div className="py-16 text-center">
                      <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="font-display text-xs tracking-widest text-[var(--muted)]">LOADING HISTORY STATEMENTS…</p>
                    </div>
                  ) : !visibleHistory.length ? (
                    <div className="px-5 py-14 text-center">
                      <p className="font-display text-sm tracking-[0.2em] text-[var(--muted)]">
                        {historyView === 'game' ? 'NO GAME ACTIVITY YET' : 'NO WALLET ACTIVITY YET'}
                      </p>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        {historyView === 'game'
                          ? 'Launch games from the lobby to see your gameplay sessions logged here.'
                          : 'Recharges, debits, and winnings will appear here automatically.'}
                      </p>
                    </div>
                  ) : (
                    visibleHistory.map((row) => {
                      const type = String(row.type || row.kind || '').toUpperCase()
                      const isLaunch = type === 'LAUNCH'
                      const isDebit = type === 'DEBIT' || type === 'BET'
                      const isCredit = type === 'CREDIT' || type === 'WIN'
                      const label = isLaunch
                        ? 'PLAY'
                        : isDebit
                          ? 'DEBIT'
                          : isCredit
                            ? 'CREDIT'
                            : type || 'TX'
                      const amount = Math.abs(Number(row.amount) || 0)
                      const targetId = row.transactionId || row.sessionId || row.roundId

                      return (
                        <div key={`${label}-${row.id || row.transactionId || Math.random()}`} className="history-row">
                          <span
                            className={`history-badge ${isLaunch ? 'launch' : isDebit ? 'bet' : isCredit ? 'win' : 'tx'
                              }`}
                          >
                            {label}
                          </span>
                          <div className="min-w-0">
                            <p className="font-display truncate text-sm font-bold tracking-wide">
                              {row.gameTitle || row.gameId || 'Wallet Transfer'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="truncate text-xs font-semibold text-[var(--muted)]">
                                {isLaunch
                                  ? `Session ${shortId(row.sessionId)}`
                                  : shortId(row.transactionId || row.roundId)}
                                {!isLaunch && row.status ? ` · ${row.status}` : ''}
                              </span>
                              {targetId ? (
                                <button
                                  type="button"
                                  title="Copy ID"
                                  className="text-[var(--muted)] hover:text-white p-0.5"
                                  onClick={() => copyText(targetId, 'Transaction ID')}
                                >
                                  {copiedId === targetId ? <IconCheck /> : <IconCopy />}
                                </button>
                              ) : null}
                            </div>
                          </div>
                          <div className="history-meta text-right">
                            {isLaunch ? (
                              <p className="font-display text-sm font-bold text-[var(--muted)]">
                                Session Started
                              </p>
                            ) : (
                              <p
                                className={`font-display text-sm font-bold ${isDebit ? 'text-[#fda4af]' : 'text-[var(--lime)]'
                                  }`}
                              >
                                {isDebit ? '−' : '+'}₹{amount.toLocaleString('en-IN')}
                              </p>
                            )}
                            <p className="mt-0.5 text-xs text-[var(--muted)]">
                              {formatWhen(row.createdAt)}
                            </p>
                            {!isLaunch && typeof row.balanceAfter === 'number' ? (
                              <p className="text-[0.65rem] text-[var(--muted)]">
                                Balance: ₹{Number(row.balanceAfter).toLocaleString('en-IN')}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ) : null}

            {/* PROFILE & WALLET TAB */}
            {showWallet ? (
              <div className="profile-page">
                <div className="profile-header-card">
                  <div className="profile-header-main">
                    <div className="profile-avatar-wrap" aria-hidden="true">
                      <span className="profile-avatar-fallback bg-gradient-to-tr from-amber-600 to-yellow-400 text-black font-extrabold text-2xl">
                        {userInitials(user.username)}
                      </span>
                      <span className="profile-status-dot" title="Active VIP" />
                    </div>
                    <div className="profile-header-text min-w-0">
                      <p className="profile-eyebrow text-amber-400">VIP High-Roller Member</p>
                      <h2 className="profile-name">{user.username || 'Player'}</h2>
                      <p className="profile-phone">
                        {user.phone ? `+91 ${user.phone}` : 'Verified Phone'}
                      </p>
                      <span className="profile-status-pill">Active Gold Account</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDepositOpen(true)}
                      className="btn-hero-play px-4 py-2 text-xs font-bold"
                    >
                      + Add Cash
                    </button>
                    <button
                      type="button"
                      onClick={onRefresh}
                      disabled={refreshing}
                      className="btn-game btn-purple profile-refresh-btn"
                    >
                      {refreshing ? 'Refreshing…' : 'Refresh Balance'}
                    </button>
                  </div>
                </div>

                <div className="profile-metrics">
                  <div className="profile-metric">
                    <p className="profile-metric-label">Available Balance</p>
                    <p className="profile-metric-value accent">
                      ₹{Number(user.balance ?? 0).toLocaleString('en-IN')}
                    </p>
                    <p className="profile-metric-hint">Ready for live stakes</p>
                  </div>
                  <div className="profile-metric">
                    <p className="profile-metric-label">Games Explored</p>
                    <p className="profile-metric-value">
                      {new Set(
                        gameHistory
                          .filter((h) => (h.type || h.kind) === 'LAUNCH')
                          .map((h) => h.gameId)
                          .filter(Boolean),
                      ).size || 2}
                    </p>
                    <p className="profile-metric-hint">Unique titles played</p>
                  </div>
                  <div className="profile-metric">
                    <p className="profile-metric-label">Total Transactions</p>
                    <p className="profile-metric-value">{history.length}</p>
                    <p className="profile-metric-hint">Launches and debits</p>
                  </div>
                </div>

                <div className="profile-layout">
                  <section className="profile-card">
                    <div className="profile-card-head">
                      <h3 className="profile-card-title">Account Credentials</h3>
                      <p className="profile-card-subtitle">Registered identity and wallet details</p>
                    </div>
                    <dl className="profile-info-list">
                      <div className="profile-info-row">
                        <dt>Display Name</dt>
                        <dd>{user.username || '—'}</dd>
                      </div>
                      <div className="profile-info-row">
                        <dt>Phone Number</dt>
                        <dd>{user.phone ? `+91 ${user.phone}` : '—'}</dd>
                      </div>
                      <div className="profile-info-row">
                        <dt>Player ID</dt>
                        <dd className="profile-mono flex items-center justify-end gap-1.5" title={userId}>
                          <span>{shortId(userId)}</span>
                          <button
                            type="button"
                            className="text-amber-400 hover:text-amber-300 p-0.5"
                            onClick={() => copyText(userId, 'Player ID')}
                            title="Copy Player ID"
                          >
                            {copiedId === userId ? <IconCheck /> : <IconCopy />}
                          </button>
                        </dd>
                      </div>
                      <div className="profile-info-row">
                        <dt>Currency & Region</dt>
                        <dd>INR (₹) • India</dd>
                      </div>
                      <div className="profile-info-row">
                        <dt>Fair Play Security</dt>
                        <dd>
                          <span className="profile-inline-pill">Certified RNG</span>
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <section className="profile-card">
                    <div className="profile-card-head">
                      <h3 className="profile-card-title">Quick Actions</h3>
                      <p className="profile-card-subtitle">Fast navigation and security options</p>
                    </div>
                    <div className="profile-actions">
                      <button
                        type="button"
                        className="btn-hero-play w-full py-2.5 text-xs text-center justify-center"
                        onClick={() => setDepositOpen(true)}
                      >
                        + Add Cash to Wallet
                      </button>
                      <button
                        type="button"
                        className="btn-game btn-play profile-action-btn"
                        onClick={() => selectTab('games')}
                      >
                        Browse All Games
                      </button>
                      <button
                        type="button"
                        className="btn-game btn-purple profile-action-btn"
                        onClick={() => selectTab('history')}
                      >
                        View Full Statements
                      </button>
                      <button
                        type="button"
                        className="btn-game btn-danger profile-action-btn"
                        onClick={logout}
                      >
                        <IconLogout />
                        <span>Sign Out of Arena</span>
                      </button>
                    </div>
                  </section>
                </div>

                <section className="profile-card profile-activity-card">
                  <div className="profile-card-head profile-card-head-row">
                    <div>
                      <h3 className="profile-card-title">Recent Activity</h3>
                      <p className="profile-card-subtitle">Last 5 wallet and game sessions</p>
                    </div>
                    <button
                      type="button"
                      className="profile-link-btn"
                      onClick={() => selectTab('history')}
                    >
                      View all statements →
                    </button>
                  </div>

                  {recentActivity.length ? (
                    <div className="profile-activity-list">
                      {recentActivity.map((row) => {
                        const type = String(row.type || row.kind || '').toUpperCase()
                        const isLaunch = type === 'LAUNCH'
                        const isDebit = type === 'DEBIT' || type === 'BET'
                        const isCredit = type === 'CREDIT' || type === 'WIN'
                        const label = isLaunch
                          ? 'Play'
                          : isDebit
                            ? 'Debit'
                            : isCredit
                              ? 'Credit'
                              : type || 'Event'
                        return (
                          <div key={`profile-${row.kind}-${row.id}`} className="profile-activity-row">
                            <div className="profile-activity-main min-w-0">
                              <span
                                className={`profile-activity-badge ${isLaunch ? 'neutral' : isDebit ? 'debit' : 'credit'
                                  }`}
                              >
                                {label}
                              </span>
                              <div className="min-w-0">
                                <p className="profile-activity-title">
                                  {row.gameTitle || row.gameId || 'Wallet'}
                                </p>
                                <p className="profile-activity-meta">{formatWhen(row.createdAt)}</p>
                              </div>
                            </div>
                            <div className="profile-activity-amount">
                              {isLaunch ? (
                                <span className="profile-activity-muted">Session</span>
                              ) : (
                                <span className={isDebit ? 'is-debit' : 'is-credit'}>
                                  {isDebit ? '−' : '+'}₹
                                  {Math.abs(Number(row.amount) || 0).toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="profile-empty">
                      <p>No activity recorded yet</p>
                      <button
                        type="button"
                        className="btn-game btn-play profile-empty-btn"
                        onClick={() => selectTab('games')}
                      >
                        Play a Game Now
                      </button>
                    </div>
                  )}
                </section>
              </div>
            ) : null}
          </section>

          {/* RIGHT SIDEBAR / QUICK HUB (LOBBY ONLY) */}
          {showLobby ? (
            <aside className="space-y-3.5">
              {/* Quick Wallet & Cashier Card */}
              <div className="side-card grid grid-cols-2 gap-2 place-items-center py-4">
                <div className="flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="80" viewBox="0 0 142 125">
                  <defs>
                    <path id="a" d="M.22.35h21.59v24.544H.22z" />
                    <path id="c" d="M.272.195h12.557v23.567H.272z" />
                  </defs>
                  <g fill="none" fill-rule="evenodd">
                    <path fill="#E50539" d="M46.558 82l-4.136 16.799c-.345 1.343-1.12 2.499-2.332 3.462-1.212.963-2.494 1.448-3.835 1.448L41.609 82h-6.62l-.684 3.291L29 107h6.436c3.14 0 6.124-1.189 8.957-3.56 2.833-2.373 4.632-5.164 5.408-8.373l2.391-9.776L53 82h-6.442z" />
                    <path fill="#E50539" d="M65.345 71.98c-.562-.652-1.31-.98-2.243-.98-.938 0-1.792.328-2.573.98-.775.651-1.241 1.434-1.393 2.343-.163.947.04 1.74.601 2.392.556.652 1.303.98 2.236.98.939 0 1.798-.334 2.58-1.001.775-.669 1.247-1.457 1.398-2.371.152-.909-.05-1.692-.606-2.343m-6.3 29.354c.012-.066.035-.148.068-.246.034-.1.057-.16.062-.198l4.804-18.706h-11.13L52 85.458h4.455l-4 15.432a2.949 2.949 0 0 0-.146.592c-.287 1.691.157 3.033 1.326 4.03 1.169.99 2.905 1.488 5.214 1.488h1l.854-3.274c-1.337-.191-1.893-.99-1.657-2.392M77.209 100.012c-.257 1.015-.824 1.887-1.701 2.61-.878.722-1.814 1.08-2.799 1.08-1.845 0-2.62-.916-2.332-2.758.006-.027.027-.11.064-.242.038-.132.06-.232.07-.298l3.065-12.646c.418-1.638 1.295-2.46 2.633-2.46h4.585l-3.585 14.714zm5.954 1.87a.937.937 0 0 1 .06-.198.85.85 0 0 0 .053-.193L88 82H76.974c-2.296 0-4.43.667-6.405 1.997-1.979 1.329-3.204 2.994-3.68 4.99l-2.665 11.025a3.357 3.357 0 0 0-.144.64c-.294 1.837.224 3.354 1.562 4.55 1.337 1.197 3.087 1.798 5.254 1.798h1c1.878 0 3.622-.672 5.238-2.019.808 1.347 2.322 2.019 4.548 2.019h2.247l.808-3.298c-1.23-.066-1.755-.673-1.574-1.82zM114.468 88.447l-.086.54-2.674 11.025c-.286 1.18-.754 2.09-1.4 2.73-.645.64-1.318.96-2.023.96-.64 0-1.13-.293-1.47-.888-.338-.59-.43-1.34-.285-2.261.01-.067.033-.155.07-.27a2.64 2.64 0 0 0 .065-.27l2.675-11.025c.269-1.081.715-1.958 1.334-2.631.62-.672 1.313-1.01 2.083-1.01.64 0 1.125.271 1.453.812.328.546.42 1.307.258 2.288m4.898-4.649c-1.33-1.197-3.078-1.798-5.258-1.798h-1.007c-2.373 0-4.536.673-6.495 2.019-1.96 1.346-3.176 3.005-3.65 4.969l-2.728 11.024a3.805 3.805 0 0 0-.145.64c-.302 1.87.22 3.392 1.571 4.578 1.346 1.18 3.127 1.77 5.334 1.77h.958c2.341 0 4.494-.684 6.474-2.04 1.98-1.363 3.202-3.012 3.676-4.948l2.723-11.024.102-.634c.291-1.842-.226-3.359-1.555-4.556" />
                    <g transform="translate(120 81)">
                      <mask id="b" fill="#fff">
                        <use xlink:href="#a" />
                      </mask>
                      <path fill="#E50539" d="M19.587.35c-2.673 0-4.986.694-6.932 2.08l.499-2.08h-6.6L.221 24.895h6.633l3.444-13.428c.438-1.646 1.297-3.183 2.578-4.613 1.281-1.434 2.723-2.425 4.337-2.972l-.787 3.189h3.615l1.77-6.72h-2.224z" mask="url(#b)" />
                    </g>
                    <path fill="#E50539" d="M16.623 89.437l.011-.073 2.981-11.716c.22-.98.68-1.791 1.381-2.424.701-.631 1.496-.948 2.364-.948.817 0 1.413.274 1.81.833.388.547.523 1.253.388 2.097l-.074.442-2.981 11.716-.021.073h-5.859zm13.569-16.583C28.706 71.62 26.708 71 24.187 71c-2.751 0-5.168.695-7.27 2.076-2.103 1.38-3.432 3.213-3.997 5.499l-2.7 10.789c-2.28 0-4.393.01-6.036.01C1.862 89.374 0 91.28 0 93.62h9.154L5.817 107h6.444l3.348-13.38h5.869l-2.082 8.302a3.153 3.153 0 0 0-.147.632c-.23 1.402.042 2.497.827 3.277.774.78 1.956 1.169 3.535 1.169h2.574l.827-3.277c-.932-.063-1.319-.568-1.161-1.506l5.89-23.642c.01-.074.03-.2.083-.39.052-.2.073-.327.084-.4.334-2.044-.241-3.688-1.716-4.931zM100.228 81.65l1.45-5.65h-6.4l-1.402 5.65h-3.14l-.815 3.213h3.147l-3.82 15.19c-.011.065-.038.178-.081.34a3.332 3.332 0 0 0-.075.337c-.267 1.628.048 2.912.942 3.857.9.94 2.253 1.413 4.067 1.413h2.247l.819-3.26c-1.316-.124-1.862-.876-1.637-2.251.01-.065.031-.145.064-.242.027-.097.048-.156.053-.193l3.816-15.191h2.723L103 81.65h-2.772zM94.217 38L80 35.067 94.213 29 97 32.441zM28 63v.019l.028-.019z" />
                    <path fill="#E50539" d="M87.73 39.881c-.51.752-1.7 2.15-3.449 1.865-.853-.144-35.6-7.164-35.686-7.17-.245-.066-.212-.587.231-.534L87.5 39.354c.244.04.377.316.231.527M86.426 27.28l-5.216 2.663s-1.212-.731.152-1.345c.351-.157 1.152-.612 1.8-.949a.471.471 0 0 0-.046-.856l-3.879-1.55c.656-.52 1.675-.83 2.648-.54.563.171 2.92 1.16 4.468 1.806.477.198.364.627.073.771m-12.294 3.56c-.556.396-4.22-.285-4.22-.285s4.054-3.587 7.91-4.046c1.147-.136 3.467.758 3.467.758s-5.171 2.15-7.157 3.573m39.56-.192c-1.714-3.736-2.972-6.927-3.422-7.691-1.31-2.208-3.263-2.09-4.938-1.8-4.468.765-6.21 1.55-14.087 3.632-1.158.317-3.343.956-4.547.54-3.191-1.087-4.157-1.957-5.686-1.786-2.37.27-7.243 2.551-12.531 6.4-1.656 1.186-1.464 2.602-1.755 3.538a.332.332 0 0 0 .285.428c.767.08 9.161.806 9.545.859a.347.347 0 0 1-.192-.31c0-.112.053-.224.172-.283 2.397-1.286 11.095-5.873 16.351-7.936 7.189-2.84 8.923-3.144 11.108-3.348.51-.046 1.225-.013 1.748.02.423.033.794.29.926.678.993 2.9 3.9 9.452 5.435 11.62 0 0-.271.514-.788.54-.404.008-1.224-.75-1.734-1.199a.349.349 0 0 0-.404-.026c-8.619 5.293-14.835 7.6-15.728 7.916a.296.296 0 0 1-.225-.007l-4.402-1.634s.165-.139.576-.956c.085-.191.132-.409.125-.547-.033-.699-.708-.857-1.013-.897-1.171-.145-32.635-4.765-40.525-5.536-3.35-.336-6.534 1.37-7.911 3.157l.007.046 4.468 4.636c.1.105.252.132.378.072l3.515-1.61s.482 1.483.033 1.733c-2.92 1.595-5.746 3.02-8.48 4.449-1.1.58-1.073 1.672-1.43 3.21-.15.644-.225 1.233-.225 1.233s6.13-3.059 9.883-4.845a.336.336 0 0 1 .384.073c.536.573.712.705 1.076 1.067a.33.33 0 0 1-.079.528c-.887.467-1.8.948-2.502 1.364-.556.33.009 1.43.009 1.43l10.2-4.81s.636.625-.49 1.317C55.083 47 38.997 55.165 37.613 55.2c-3.647.092-10.531-6.743-13.02-7.784-2.099-.877-4.356.553-7.421 2.346-.834.494-.325 1.687-.325 1.687l4.442-2.24s.55.632-.066 1.014c-2.151 1.358-5.262 2.716-5.74 3.059-.7.5-.431 2.847-.431 2.847l4.202-1.94c.126-.059.285-.039.344.02l9.006 8.537a10.145 10.145 0 0 0 1.668-.56l-7.513-7.955a.334.334 0 0 1 .093-.527c.767-.39 1.688-.673 2.985.316 1.092.824 4.912 3.902 8.606 3.572 1.231-.105 1.251.27 1.251.27s-1.569.752-3.43 1.767c-.92.507-.171 1.845-.171 1.845 9.519-3.888 21.242-8.726 22.884-9.431a.345.345 0 0 1 .338.046l2.753 2.175c.39.606 19.972-6.888 26.01-9.926.337-.165 3.408-.027 4.891-.04.682 0 .656.297.656.297s-49.006 19.45-61.028 19.001l-.02.013-2.561 1.095c1.503.988 1.145 2.695 3.7 1.377.152.35.331.719.517 1.114.496 1.075.496 1.081 3.746-.02 9.195-3.097 50.548-15.403 59.81-19.219 5.229-2.148 12.458-5.114 16.966-7.896 4.448-2.735 5.355-4.146 2.939-9.412M112.278 24.01c-.047.009-.102.018-.149.037a.385.385 0 0 0-.129.084l.5-.131c-.084 0-.148.01-.222.01M125.837 50.893l-.066.104-.073-.104c-.046-.066-4.593-6.67-6.237-9.227-.497-.771.086-1.157.086-1.157l.066-.04.047.06c.232.287 5.594 7.18 6.29 8.448.53.948-.086 1.876-.113 1.916m1.1-1.36c-.291-1.152-2.425-8.782-3.658-11.581L117.658 28c-.537.713-1.167 1.478-1.77 2.034-.113.091-.232.17-.37.235a1.473 1.473 0 0 1-.518.118l3.029 9.814c.45 1.577 1.505 2.917 2.413 4.277.457.673 3.678 5.414 4.918 7.232.258.38.835.392 1.087.006.45-.68.67-1.503.49-2.184" />
                    <g transform="translate(103)">
                      <mask id="d" fill="#fff">
                        <use xlink:href="#c" />
                      </mask>
                      <path fill="#E50539" d="M7.823 12.13l-.068.04-.047-.06c-.23-.302-5.682-7.35-6.403-8.655-.527-.977.094-1.921.121-1.961l.067-.1.075.1c.047.073 4.682 6.84 6.35 9.45.505.79-.088 1.179-.095 1.185zm1.686.702c-.627-2.108-1.7-3.474-2.631-4.873A2595.75 2595.75 0 0 0 1.804.443.57.57 0 0 0 .859.45C.366 1.18.151 2.096.34 2.832c.304 1.172 2.403 8.943 3.658 11.807l5.222 9.123c.129-.14.29-.26.473-.341a1.2 1.2 0 0 1 .391-.094c.689-.047 1.768-.04 2.746-.02L9.51 12.832z" mask="url(#d)" />
                    </g>
                    <path fill="#E50539" d="M113.692 26.827l-.826-1.753s-.15-.262.19-.4c.027-.012.054-.025.088-.031 0 0 3.419-.112 4.489.081.568.106.589.293.589.293l-4.53 1.81zm4.692-2.558c-1.428-.294-4.13-.313-5.748-.219-.068 0-.115 0-.176.006-.034.007-.075.013-.115.025a.3.3 0 0 0-.102.063c-.183.125-.298.368-.217.555a56.269 56.269 0 0 0 2.472 5.08c.122.231.48.269.738.169a.788.788 0 0 0 .149-.087c1.38-1.186 2.68-2.865 3.5-4.531.25-.524.095-.937-.5-1.061zM101.038 24s-.612 2.533-1.575 5.458l-1.784-2.259-1.446.659 2.63 3.335c-.82 2.25-1.81 4.488-2.863 5.807l2.636-1.2c.6-.558 1.085-1.686 1.462-3.038l1.448 1.837 1.454-.663-2.455-3.109c.531-2.81.683-5.867.493-6.827M90.25 118h-38.5c-.962 0-1.75-.9-1.75-2s.788-2 1.75-2h38.5c.962 0 1.75.9 1.75 2s-.788 2-1.75 2M83.249 125H58.75c-.963 0-1.751-.9-1.751-2s.788-2 1.751-2H83.25c.963 0 1.751.9 1.751 2s-.788 2-1.751 2" />
                  </g>
                </svg>
                <span className="font-display text-xs font-bold text-white tracking-wide uppercase">Aviator Game</span>
                </div>
                
                <div className="flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="80" viewBox="0 0 100 100" className="mx-auto drop-shadow-lg">
                  <rect x="0" y="0" width="100" height="100" rx="15" fill="#fff" />
                  
                  <rect x="8" y="8" width="35" height="35" rx="6" fill="#E50539" />
                  <rect x="15" y="15" width="21" height="21" rx="4" fill="#fff" />
                  <circle cx="20" cy="20" r="3" fill="#E50539" />
                  <circle cx="31" cy="20" r="3" fill="#E50539" />
                  <circle cx="20" cy="31" r="3" fill="#E50539" />
                  <circle cx="31" cy="31" r="3" fill="#E50539" />

                  <rect x="57" y="8" width="35" height="35" rx="6" fill="#00A859" />
                  <rect x="64" y="15" width="21" height="21" rx="4" fill="#fff" />
                  <circle cx="69" cy="20" r="3" fill="#00A859" />
                  <circle cx="80" cy="20" r="3" fill="#00A859" />
                  <circle cx="69" cy="31" r="3" fill="#00A859" />
                  <circle cx="80" cy="31" r="3" fill="#00A859" />

                  <rect x="8" y="57" width="35" height="35" rx="6" fill="#0072CE" />
                  <rect x="15" y="64" width="21" height="21" rx="4" fill="#fff" />
                  <circle cx="20" cy="69" r="3" fill="#0072CE" />
                  <circle cx="31" cy="69" r="3" fill="#0072CE" />
                  <circle cx="20" cy="80" r="3" fill="#0072CE" />
                  <circle cx="31" cy="80" r="3" fill="#0072CE" />

                  <rect x="57" y="57" width="35" height="35" rx="6" fill="#FFC90E" />
                  <rect x="64" y="64" width="21" height="21" rx="4" fill="#fff" />
                  <circle cx="69" cy="69" r="3" fill="#FFC90E" />
                  <circle cx="80" cy="69" r="3" fill="#FFC90E" />
                  <circle cx="69" cy="80" r="3" fill="#FFC90E" />
                  <circle cx="80" cy="80" r="3" fill="#FFC90E" />

                  <polygon points="50,50 43,43 57,43" fill="#00A859" />
                  <polygon points="50,50 57,43 57,57" fill="#FFC90E" />
                  <polygon points="50,50 57,57 43,57" fill="#0072CE" />
                  <polygon points="50,50 43,57 43,43" fill="#E50539" />
                  
                  <rect x="43" y="8" width="14" height="35" fill="#f1f5f9" />
                  <rect x="43" y="15" width="14" height="7" fill="#00A859" opacity="0.3" />
                  <rect x="43" y="29" width="14" height="14" fill="#00A859" opacity="0.3" />
                  
                  <rect x="43" y="57" width="14" height="35" fill="#f1f5f9" />
                  <rect x="43" y="57" width="14" height="14" fill="#0072CE" opacity="0.3" />
                  <rect x="43" y="78" width="14" height="7" fill="#0072CE" opacity="0.3" />

                  <rect x="8" y="43" width="35" height="14" fill="#f1f5f9" />
                  <rect x="15" y="43" width="7" height="14" fill="#E50539" opacity="0.3" />
                  <rect x="29" y="43" width="14" height="14" fill="#E50539" opacity="0.3" />

                  <rect x="57" y="43" width="35" height="14" fill="#f1f5f9" />
                  <rect x="57" y="43" width="14" height="14" fill="#FFC90E" opacity="0.3" />
                  <rect x="78" y="43" width="7" height="14" fill="#FFC90E" opacity="0.3" />
                  
                </svg>
                <span className="font-display text-xs font-bold text-white tracking-wide uppercase">Ludo Game</span>
                </div>



              </div>

              {/* Recent Activity Mini-Feed */}
              <div className="side-card">
                <div className="flex items-center justify-between">
                  <p className="font-display text-[0.65rem] font-bold tracking-[0.16em] text-[var(--muted)]">
                    RECENT ACTIVITY
                  </p>
                  <button
                    type="button"
                    className="text-xs text-amber-400 hover:underline"
                    onClick={() => selectTab('history')}
                  >
                    All →
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {recent.length ? (
                    recent.map((row) => {
                      const type = String(row.type || row.kind || '').toUpperCase()
                      const label =
                        type === 'DEBIT' || type === 'BET'
                          ? 'DEBIT'
                          : type === 'CREDIT' || type === 'WIN'
                            ? 'CREDIT'
                            : type
                      const isCredit = label === 'CREDIT'
                      return (
                        <button
                          key={`side-${row.kind}-${row.id}`}
                          type="button"
                          className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-[var(--panel-2)] px-2.5 py-2 text-left hover:border-amber-400/30 transition-colors"
                          onClick={() => selectTab('history')}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-white">
                              {row.gameTitle || row.gameId || 'Wallet'}
                            </p>
                            <p className="text-[0.65rem] text-[var(--muted)]">
                              {formatWhen(row.createdAt)}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 font-display text-xs font-bold ${isCredit ? 'text-emerald-400' : 'text-red-400'
                              }`}
                          >
                            {isCredit ? '+' : '−'}₹{Math.abs(Number(row.amount) || 0).toLocaleString('en-IN')}
                          </span>
                        </button>
                      )
                    })
                  ) : (
                    <p className="text-xs font-semibold text-[var(--muted)] py-2 text-center">No transactions yet</p>
                  )}
                </div>

                <button
                  type="button"
                  className="btn-game btn-purple mt-3 w-full py-2.5 text-xs font-bold"
                  onClick={() => selectTab('history')}
                >
                  Full Statement
                </button>
              </div>

              {/* Trust Guarantees */}
              <div className="side-card">
                <p className="font-display text-[0.65rem] font-bold tracking-[0.16em] text-[var(--muted)] mb-2">
                  PLATFORM INTEGRITY
                </p>
                <div className="space-y-2 text-xs text-[var(--muted)]">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">🛡️</span>
                    <span>256-Bit SSL Encrypted Gaming</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Instant UPI & NetBanking Payouts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">🎲</span>
                    <span>Certified Provably Fair RNG</span>
                  </div>
                </div>
              </div>
            </aside>
          ) : null}
        </div>

        {/* Mobile Bottom Floating Dock */}
        <nav className="mobile-bottom-dock" aria-label="Mobile Navigation">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`dock-item ${tab === id ? 'is-active' : ''}`}
              onClick={() => selectTab(id)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
