import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { fetchGames, fetchGameHistory, launchGame, creditWallet } from '../api'
import siteLogo from '../assets/logo-123games.png'
import HeroSection from '../components/HeroSection'
import tpClassic from '../assets/tp_classic-Photoroom.png'
import tpAk47 from '../assets/tp_ak47-Photoroom.png'
import tpMuflis from '../assets/tp_muflis-Photoroom.png'
import tpFlipper from '../assets/tp_flipper-Photoroom.png'
import tpJhandu from '../assets/tp_jhandu-Photoroom.png'

/** Public CDN images (Unsplash / Microsoft CDN) for lobby art */
const IMAGES = {
  teenpatti: tpClassic,
  ak47: tpAk47,
  muflis: tpMuflis,
  flipper: tpFlipper,
  jhandu: tpJhandu,
  ludo: 'https://store-images.s-microsoft.com/image/apps.38011.13964317340864868.4c21ecf1-2804-40c6-bd9e-a2efd241f30b.7fb161ca-d8f2-4e3a-9f2b-4992fa436cd1?q=90&w=1200&h=600',
  bonus: tpAk47,
  jackpot: tpMuflis,
  defaultGame: tpClassic,
}

/** Teen Patti Variants Catalog */
export const TEEN_PATTI_VARIANTS = [
  {
    id: 'classic',
    gameId: 'TEENPATTI',
    name: 'Teen Patti Classic',
    title: 'Teen Patti Classic',
    shortTitle: 'Classic',
    tag: 'CLASSIC',
    tagClass: 'tag-gold',
    summary: 'Standard Teen Patti rules and table game.',
    rule: 'Standard hierarchy: Trail (Trio) > Pure Sequence > Sequence > Color > Pair > High Card. Highest hand takes the pot.',
    badge: '👑 Classic Rules',
    badgeColor: '#fbbf24',
    badgeBg: 'rgba(251, 191, 36, 0.15)',
    icon: '👑',
    chips: '3 Cards • Trail • Sequence',
    launchUrl: 'https://www.doormart.shop/public?variant=classic',
    image: tpClassic,
    players: '2,420',
  },
  {
    id: 'ak47',
    gameId: 'TEENPATTI_AK47',
    name: 'Teen Patti AK47',
    title: 'Teen Patti AK47',
    shortTitle: 'AK47',
    tag: 'AK47 WILD',
    tagClass: 'tag-orange',
    summary: 'A, K, 4, and 7 are jokers.',
    rule: 'Any Ace, King, 4, or 7 card becomes a Joker (wild card) that substitutes for any rank or suit to complete your highest hand.',
    badge: '🔥 A, K, 4, 7 Jokers',
    badgeColor: '#f97316',
    badgeBg: 'rgba(249, 115, 22, 0.15)',
    icon: '🔥',
    chips: 'A • K • 4 • 7 Jokers',
    launchUrl: 'https://www.doormart.shop/public?variant=ak47',
    image: tpAk47,
    players: '1,890',
  },
  {
    id: 'muflis',
    gameId: 'TEENPATTI_MUFLIS',
    name: 'Teen Patti Muflis',
    title: 'Teen Patti Muflis',
    shortTitle: 'Muflis',
    tag: 'LOWBALL',
    tagClass: 'tag-cyan',
    summary: 'Lowest hand wins.',
    rule: 'Opposite rules (Lowball). A trail of AAA is the worst hand; the lowest high-card (5-3-2 unsuited) is the champion winning hand.',
    badge: '🔄 Lowest Hand Wins',
    badgeColor: '#06b6d4',
    badgeBg: 'rgba(6, 182, 212, 0.15)',
    icon: '🔄',
    chips: 'Lowest Hand Wins Pot',
    launchUrl: 'https://www.doormart.shop/public?variant=muflis',
    image: tpMuflis,
    players: '1,540',
  },
  {
    id: 'flipper',
    gameId: 'TEENPATTI_FLIPPER',
    name: 'Teen Patti Flipper',
    title: 'Teen Patti Flipper',
    shortTitle: 'Flipper',
    tag: '4-CARDS',
    tagClass: 'tag-blue',
    summary: '4 cards dealt; public and folded game.',
    rule: 'Each player receives 4 cards; public & folded reserve cards dynamically add joker ranks with thrilling flip action.',
    badge: '⚡ 4-Card Twist',
    badgeColor: '#3b82f6',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    icon: '⚡',
    chips: '4 Cards • Reserve Flips',
    launchUrl: 'https://www.doormart.shop/public?variant=flipper',
    image: tpFlipper,
    players: '1,280',
  },
  {
    id: 'jhandu',
    gameId: 'TEENPATTI_JHANDU',
    name: 'Teen Patti Jhandu',
    title: 'Teen Patti Jhandu',
    shortTitle: 'Jhandu',
    tag: 'CYCLE JOKER',
    tagClass: 'tag-purple',
    summary: 'Shared jokers unlock by cycle.',
    rule: 'Shared jokers unlock round by round in cycles. Sideshow and final show unlock as table cycles advance.',
    badge: '🎯 Cycle Jokers',
    badgeColor: '#a855f7',
    badgeBg: 'rgba(168, 85, 247, 0.15)',
    icon: '🎯',
    chips: 'Cycle Jokers • Delayed Show',
    launchUrl: 'https://www.doormart.shop/public?variant=jhandu',
    image: tpJhandu,
    players: '1,110',
  },
]

function getVariantMeta(game) {
  if (!game) return null
  const key = String(game.gameId || game.title || game.name || '').toLowerCase()
  if (key.includes('ak47')) return TEEN_PATTI_VARIANTS.find((v) => v.id === 'ak47')
  if (key.includes('muflis')) return TEEN_PATTI_VARIANTS.find((v) => v.id === 'muflis')
  if (key.includes('flipper') || key.includes('fliiper')) return TEEN_PATTI_VARIANTS.find((v) => v.id === 'flipper')
  if (key.includes('jhandu')) return TEEN_PATTI_VARIANTS.find((v) => v.id === 'jhandu')
  if (key.includes('classic') || key === 'teenpatti') return TEEN_PATTI_VARIANTS.find((v) => v.id === 'classic')
  return null
}

const LIVE_WINNERS = [
  { name: 'Rohit K.', game: 'Teen Patti Classic', amount: 18500, time: 'Just now' },
  { name: 'Sneha P.', game: 'Teen Patti AK47', amount: 26200, time: '2m ago' },
  { name: 'Vikram M.', game: 'Teen Patti Muflis', amount: 32000, time: '5m ago' },
  { name: 'Ankit D.', game: 'PotLudo', amount: 9500, time: '8m ago' },
  { name: 'Pooja R.', game: 'Teen Patti Flipper', amount: 14200, time: '11m ago' },
  { name: 'Karan S.', game: 'Teen Patti Jhandu', amount: 18000, time: '16m ago' },
  { name: 'VIP #4092', game: 'Teen Patti AK47', amount: 50000, time: '20m ago' },
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
  const key = String(game?.gameId || game?.title || game?.name || '').toLowerCase()
  if (key.includes('ak47')) return IMAGES.ak47
  if (key.includes('muflis')) return IMAGES.muflis
  if (key.includes('flipper') || key.includes('fliiper')) return IMAGES.flipper
  if (key.includes('jhandu')) return IMAGES.jhandu
  if (key.includes('classic') || key === 'teenpatti' || key.includes('teen') || key.includes('patti')) return IMAGES.teenpatti
  if (game?.image && String(game.image).startsWith('http')) return game.image
  if (key.includes('ludo')) return IMAGES.ludo
  return IMAGES.defaultGame
}

function gameTag(game, index) {
  const key = String(game?.gameId || game?.title || game?.name || '').toLowerCase()
  if (key.includes('ak47')) return { label: 'AK47 WILD', className: 'tag-orange' }
  if (key.includes('muflis')) return { label: 'LOWBALL', className: 'tag-cyan' }
  if (key.includes('flipper') || key.includes('fliiper')) return { label: '4-CARDS', className: 'tag-blue' }
  if (key.includes('jhandu')) return { label: 'CYCLE JOKER', className: 'tag-purple' }
  if (key.includes('classic') || key === 'teenpatti') return { label: 'CLASSIC', className: 'tag-gold' }
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
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [depositOpen, setDepositOpen] = useState(false)
  const [depositAmount, setDepositAmount] = useState(500)
  const [depositLoading, setDepositLoading] = useState(false)
  const [variantModalOpen, setVariantModalOpen] = useState(false)
  const [selectedVariantDetail, setSelectedVariantDetail] = useState(null)
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
    // Search is not shown on the Home lobby, so don't let a stale query filter it
    if (tab === 'lobby') setSearchQuery('')
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
    } else if (activeCategory === 'teenpatti') {
      result = result.filter((g) => {
        const k = String(g.gameId || g.title || g.name || '').toLowerCase()
        return (
          k.includes('teen') ||
          k.includes('patti') ||
          k.includes('ak47') ||
          k.includes('muflis') ||
          k.includes('flipper') ||
          k.includes('fliiper') ||
          k.includes('jhandu')
        )
      })
    } else if (activeCategory === 'cards') {
      result = result.filter((g) => {
        const k = String(g.gameId || g.title || g.name || '').toLowerCase()
        return (
          k.includes('teen') ||
          k.includes('patti') ||
          k.includes('card') ||
          k.includes('poker') ||
          k.includes('ak47') ||
          k.includes('muflis') ||
          k.includes('flipper') ||
          k.includes('fliiper') ||
          k.includes('jhandu')
        )
      })
    } else if (activeCategory === 'board') {
      result = result.filter((g) => {
        const k = String(g.gameId || g.title || g.name || '').toLowerCase()
        return k.includes('ludo') || k.includes('dice') || k.includes('pot')
      })
    } else if (activeCategory === 'hot') {
      result = result.slice(0, 8)
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
      .then((res) => {
        const remoteGames = res.data || []
        const merged = [...remoteGames]
        for (const v of TEEN_PATTI_VARIANTS) {
          const exists = merged.some(
            (g) =>
              g.gameId === v.gameId ||
              (v.gameId === 'TEENPATTI' && g.gameId === 'TEENPATTI_CLASSIC') ||
              String(g.title || g.name || '').toLowerCase().includes(v.id),
          )
          if (!exists) {
            merged.push({
              _id: `variant_${v.id}`,
              gameId: v.gameId,
              name: v.name,
              title: v.title,
              provider: 'DIRECT',
              status: 'active',
              image: v.image,
              launchUrl: v.launchUrl,
            })
          }
        }
        setGames(merged)
      })
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

  async function onPlay(game, extraOptions = {}) {
    if (launching) return
    const gameId = game.gameId || game.gameCode
    const meta = getVariantMeta(game)
    const variant = extraOptions?.variant || meta?.id || ''
    setError('')
    setLaunching(gameId)
    try {
      await refreshBalance()
      const res = await launchGame(gameId, variant ? { variant } : {})
      const url = res.launchUrl
      if (!url) throw new Error('Launch URL missing from response')
      sessionStorage.setItem('allgames_tab', 'games')
      setTab('games')

      const playSession = {
        launchUrl: url,
        gameName: game.title || game.name || (meta ? meta.name : gameId),
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



  // function renderWinnersMarquee() {
  //   return (
  //     <div className="marquee-container" aria-label="Recent Live Winners">

  //       <div className="marquee-track">
  //         {[...LIVE_WINNERS, ...LIVE_WINNERS].map((win, i) => (
  //           <div key={i} className="marquee-item">
  //             <span>👤</span>
  //             <strong>{win.name}</strong>
  //             <span>won</span>
  //             <span className="marquee-amount">₹{win.amount.toLocaleString('en-IN')}</span>
  //             <span>in {win.game}</span>
  //             <span className="text-[var(--muted)] text-xs">({win.time})</span>
  //           </div>
  //         ))}
  //       </div>
  //     </div>
  //   )
  // }

  function renderLobbyControls({ showSearch = true } = {}) {
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
            aria-selected={activeCategory === 'teenpatti'}
            className={`cat-pill ${activeCategory === 'teenpatti' ? 'is-active' : ''}`}
            onClick={() => setActiveCategory('teenpatti')}
          >
            <span>🃏 Teen Patti</span>
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

        {showSearch ? (
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
        ) : null}
      </div>
    )
  }

  function renderGameCards() {
    return (
      <>
        {/* Subtle glowing red bar matching reference design header */}
        <div className="w-14 h-1 rounded-full bg-red-600/80 mx-auto mb-3.5 shadow-[0_0_12px_rgba(239,68,68,0.75)]" />

        <div className="game-grid grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
          {filteredGames.map((game, index) => {
            const id = game.gameId || game.gameCode
            const busy = launching === id
            const title = game.title || game.name || id
            const variantMeta = getVariantMeta(game)
            const isFav = favorites.includes(id)
            const cardImg = variantMeta?.image || gameImage(game)
            const displayTitle = variantMeta?.shortTitle || title
            const displaySubtitle =
              variantMeta?.summary ||
              game.summary ||
              game.description ||
              'Standard Teen Patti rules and table game.'

            return (
              <article
                key={game._id || id}
                className="tp-luxury-card group"
                onClick={() => onPlay(game, variantMeta ? { variant: variantMeta.id } : {})}
              >
                {/* Translucent Poker Club Watermark */}
                <div className="tp-card-watermark" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a4 4 0 0 0-3.8 2.8A4.5 4.5 0 0 0 4 9.2c0 2.2 1.6 4.1 3.8 4.4a2 2 0 0 0 .7 0c-.5 1.5-1.5 3.4-3.5 4.4h14c-2-1-3-2.9-3.5-4.4.2 0 .5 0 .7 0 2.2-.3 3.8-2.2 3.8-4.4a4.5 4.5 0 0 0-4.2-4.4A4 4 0 0 0 12 2z" />
                  </svg>
                </div>

                {/* Left: 3D Artwork (Aces, Royal Crown, Chips on Red Saucer Disc) */}
                <div className="tp-card-visual">
                  <img
                    src={cardImg}
                    alt={displayTitle}
                    loading="lazy"
                  />
                </div>

                {/* Center: Title & Description */}
                <div className="tp-card-body">
                  <div className="flex items-center gap-2">
                    <h3 className="tp-card-title">
                      {displayTitle}
                    </h3>
                    {isFav ? (
                      <span className="text-amber-400 text-xs shrink-0" title="In Favorites">⭐</span>
                    ) : null}
                  </div>
                  <p className="tp-card-subtitle">
                    {displaySubtitle}
                  </p>
                </div>

                {/* Right: Actions */}
                <div className="tp-card-actions">
                  <button
                    type="button"
                    disabled={Boolean(launching)}
                    onClick={(e) => {
                      e.stopPropagation()
                      onPlay(game, variantMeta ? { variant: variantMeta.id } : {})
                    }}
                    className="tp-play-btn"
                  >
                    <span className="tp-play-icon-circle">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="8,5 19,12 8,19" />
                      </svg>
                    </span>
                    <span>{busy ? 'Launching…' : 'Play Now'}</span>
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

  function renderVariantModal() {
    if (!variantModalOpen) return null

    return (
      <div
        className="variant-modal-backdrop"
        onClick={() => setVariantModalOpen(false)}
        role="dialog"
        aria-modal="true"
        aria-label="Teen Patti Variants Guide"
      >
        <div
          className="variant-modal-content p-4 sm:p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🃏</span>
                <h3 className="font-display text-xl sm:text-2xl font-black text-white tracking-wide">
                  Teen Patti Table Variants Guide
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Explore the special rules of Classic, AK47, Muflis, Flipper, and Jhandu. Tap any variant to play instantly!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVariantModalOpen(false)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <IconClose />
            </button>
          </div>

          {/* Variants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            {TEEN_PATTI_VARIANTS.map((v) => {
              const gameObj = games.find(
                (g) =>
                  g.gameId === v.gameId ||
                  (v.gameId === 'TEENPATTI' && g.gameId === 'TEENPATTI_CLASSIC') ||
                  String(g.title || g.name || '').toLowerCase().includes(v.id),
              ) || { gameId: v.gameId, title: v.name, name: v.name }
              const busy = launching === (gameObj.gameId || v.gameId)
              const isSelected = selectedVariantDetail?.id === v.id

              return (
                <div
                  key={v.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-amber-400/[0.08] shadow-lg shadow-amber-400/10'
                      : 'border-white/10 bg-white/[0.03] hover:border-amber-400/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className="text-[0.7rem] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md flex items-center gap-1.5"
                        style={{ backgroundColor: v.badgeBg, color: v.badgeColor }}
                      >
                        <span>{v.icon}</span>
                        <span>{v.name}</span>
                      </span>
                      <span className="text-[0.68rem] sm:text-[0.7rem] font-bold text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {v.players} Live
                      </span>
                    </div>

                    <h4 className="font-display text-sm sm:text-base font-extrabold text-white mt-1">
                      {v.badge}
                    </h4>

                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      {v.rule}
                    </p>

                    <div className="mt-3 rounded-lg bg-black/40 border border-white/5 p-2.5 text-[0.72rem] text-slate-400">
                      <strong className="text-amber-300 font-semibold block mb-0.5">Quick Rule Summary:</strong>
                      {v.summary}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                    <span className="text-[0.7rem] font-bold text-slate-400">
                      {v.chips}
                    </span>
                    <button
                      type="button"
                      disabled={Boolean(launching)}
                      onClick={() => {
                        setVariantModalOpen(false)
                        onPlay(gameObj, { variant: v.id })
                      }}
                      className="px-4 py-2 text-xs font-black rounded-lg bg-amber-400 hover:bg-amber-300 text-black transition-all flex items-center gap-1.5 shadow-lg shadow-amber-400/20"
                    >
                      {busy ? (
                        <>
                          <IconRefresh spinning={true} />
                          <span>Launching…</span>
                        </>
                      ) : (
                        <span>Play {v.name} →</span>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
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

      {/* Teen Patti Variants Guide Modal */}
      {renderVariantModal()}

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
          <img src={siteLogo} alt="123Games" className="site-logo" />
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
            <img src={siteLogo} alt="123Games" className="site-logo site-logo-sm" />
          </div>
          <div className="mobile-topbar-right">
            <button
              type="button"
              onClick={() => setDepositOpen(true)}
              className="btn-gold-action px-2.5 py-1 text-[0.8rem]"
            >
              + Add
            </button>
            <div className="chip chip-compact px-2.5 py-1">
              <p className="font-display text-[0.75rem] font-bold tracking-wide text-white">
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
              className="btn-gold-action px-3.5 py-1.5 text-xs sm:text-sm"
            >
              + Add Cash
            </button>

            <div className="chip header-wallet-chip px-3 py-1">
              <div className="leading-tight">
                <p className="text-[0.55rem] font-bold uppercase tracking-[0.14em] text-white/70">
                  Wallet
                </p>
                <p className="font-display text-xs font-bold tracking-wide text-white">
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
        <div className="dash-body dash-body-single">
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
                <HeroSection
                  teenPattiGame={teenPattiGame}
                  onPlay={onPlay}
                  selectTab={selectTab}
                  setActiveCategory={setActiveCategory}
                />

                {/* 2. Live Winners Ticker */}
                {/* {renderWinnersMarquee()} */}

                {/* 3. Category Bar (search hidden on Home) */}
                {/* {renderLobbyControls({ showSearch: false })} */}

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
