
import { useEffect, useState, useMemo } from 'react'
import './HeroSection.css'

export const TEEN_PATTI_BANNER_IMG =
  'https://cdn.dmcrms.in/gamotechSolution/documents/1791529849716-Live-Dealer-Teen-Patti-Casino-1.png'

export default function HeroSection({
  teenPattiGame,
  games = [],
  onPlay,
  selectTab,
  setActiveCategory,
  onPlayTeenPatti,
  onExploreVariants,
  banners,
}) {
  const featuredGame = useMemo(() => {
    if (teenPattiGame) return teenPattiGame

    if (games.length > 0) {
      return (
        games.find((g) => {
          const k = String(
            g.gameId || g.title || g.name || ''
          ).toLowerCase()

          return k.includes('teen') || k.includes('patti')
        }) || games[0]
      )
    }

    return null
  }, [teenPattiGame, games])

  const defaultBanners = useMemo(
    () => [
      {
        id: 0,
        pill: '🃏 LIVE DEALER TEEN PATTI • 5 EXCITING MODES',
        pillClass: 'hero-pill-fire',
        title: 'Live Dealer Teen Patti Casino',
        desc:
          'Experience India’s premier multiplayer card arena. Play Classic, AK47 Wild Jokers, Muflis Lowball, Flipper & Jhandu Cycle Jokers.',
        image: TEEN_PATTI_BANNER_IMG,
        mobileImage: TEEN_PATTI_BANNER_IMG,
        stats: [
          { label: '8,240 Total Active Players', color: '#86efac' },
          { label: '5 Unique Rule Sets', color: '#fbbf24' },
          { label: 'Certified RNG Tables', color: '#60a5fa' },
        ],
        primaryLabel: 'Play Teen Patti Now',
        primaryAction: () => {
          if (onPlayTeenPatti) {
            onPlayTeenPatti()
          } else if (featuredGame && onPlay) {
            onPlay(featuredGame, { variant: 'classic' })
          } else if (selectTab) {
            selectTab('games')
          }
        },
        secondaryLabel: 'Explore All 5 Variants',
        secondaryAction: () => {
          if (onExploreVariants) {
            onExploreVariants()
          } else {
            if (setActiveCategory) {
              setActiveCategory('teenpatti')
            }
            if (selectTab) selectTab('games')
          }
        },
      },
    ],
    [
      featuredGame,
      onPlay,
      onPlayTeenPatti,
      onExploreVariants,
      selectTab,
      setActiveCategory,
    ]
  )

  const bannerList =
    banners && banners.length > 0 ? banners : defaultBanners

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (bannerList.length <= 1 || isPaused) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannerList.length)
    }, 6000)

    return () => clearInterval(timer)
  }, [bannerList.length, isPaused])

  const safeIndex =
    currentIndex < bannerList.length ? currentIndex : 0

  const activeBanner = bannerList[safeIndex]

  if (!activeBanner) return null

  const handlePrev = (e) => {
    e.stopPropagation()
    setCurrentIndex(
      (prev) => (prev - 1 + bannerList.length) % bannerList.length
    )
  }

  const handleNext = (e) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev + 1) % bannerList.length)
  }

  return (
    <section
      className="hero-carousel-container"
      aria-label="Promotions and Featured Teen Patti Game"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {(() => {
        const media = (
          <>
            <div className="hero-slide-backdrop" aria-hidden="true">
              <img
                src={activeBanner.image}
                alt=""
                className="hero-slide-backdrop-img"
              />
            </div>
            <picture className="hero-slide-media">
              {activeBanner.mobileImage && (
                <source
                  media="(max-width: 768px)"
                  srcSet={activeBanner.mobileImage}
                />
              )}
              <img
                key={activeBanner.image}
                className="hero-slide-img"
                src={activeBanner.image}
                alt={activeBanner.title || 'Featured banner'}
                loading={safeIndex === 0 ? 'eager' : 'lazy'}
                fetchPriority={safeIndex === 0 ? 'high' : 'auto'}
                decoding="async"
              />
            </picture>
          </>
        )

        const label = activeBanner.title || 'Open banner'

        if (activeBanner.link) {
          return (
            <a
              className="hero-slide hero-slide-link"
              href={activeBanner.link}
              target={activeBanner.newTab ? '_blank' : undefined}
              rel={activeBanner.newTab ? 'noopener noreferrer' : undefined}
              aria-label={label}
            >
              {media}
            </a>
          )
        }

        return (
          <button
            type="button"
            className="hero-slide hero-slide-link"
            onClick={activeBanner.primaryAction}
            aria-label={label}
          >
            {media}
          </button>
        )
      })()}

      {bannerList.length > 1 && (
        <>
          <button
            type="button"
            className="hero-nav-btn hero-nav-prev"
            onClick={handlePrev}
            aria-label="Previous banner"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button
            type="button"
            className="hero-nav-btn hero-nav-next"
            onClick={handleNext}
            aria-label="Next banner"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <div className="hero-dots-bar">
            {bannerList.map((banner, i) => (
              <button
                key={banner.id ?? i}
                type="button"
                className={`hero-dot ${
                  i === safeIndex ? 'is-active' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentIndex(i)
                }}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
