import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './HeroSection.css'

function IconChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export default function HeroSection({ banners = [], loading = false }) {
  const slides = useMemo(
    () => (Array.isArray(banners) ? banners.filter(Boolean) : []),
    [banners],
  )
  const slideCount = slides.length
  const canLoop = slideCount >= 3

  const trackRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const [paused, setPaused] = useState(false)

  const settledIndexRef = useRef(0)
  const pendingTargetRef = useRef(null)
  const requestStartScrollRef = useRef(null)
  const scrollIdRef = useRef(0)
  const hasInteractedRef = useRef(false)
  const heldDirectionRef = useRef(0)
  const inDomOrderTripRef = useRef(false)

  const getVisualOrder = useCallback((track) => {
    return Array.from(track.children)
      .map((el, domIndex) => ({ el, domIndex, offset: el.offsetLeft }))
      .sort((a, b) => a.offset - b.offset)
  }, [])

  const getNearestDomIndex = useCallback((track) => {
    const center = track.scrollLeft + track.clientWidth / 2
    let bestIndex = 0
    let bestDist = Infinity
    const children = track.children
    for (let i = 0; i < children.length; i += 1) {
      const el = children[i]
      const slideCenter = el.offsetLeft + el.offsetWidth / 2
      const dist = Math.abs(slideCenter - center)
      if (dist < bestDist) {
        bestDist = dist
        bestIndex = i
      }
    }
    return bestIndex
  }, [])

  const syncParking = useCallback(
    (currentDomIndex, { lockOverflow = true, clearParking = false } = {}) => {
      const track = trackRef.current
      if (!track || !canLoop) return
      const anchorEl = track.children[currentDomIndex]
      if (!anchorEl) return

      const nextValue = clearParking ? '' : String(currentDomIndex)
      const prevValue = track.style.getPropertyValue('--current').trim()
      if (prevValue === nextValue) return

      const before = anchorEl.offsetLeft
      const prevSnap = track.style.scrollSnapType
      const prevBehavior = track.style.scrollBehavior

      track.style.scrollSnapType = 'none'
      track.style.scrollBehavior = 'auto'
      if (lockOverflow) {
        track.style.overflowX = 'hidden'
      }

      if (clearParking) {
        track.style.removeProperty('--current')
      } else {
        track.style.setProperty('--current', nextValue)
      }

      const after = anchorEl.offsetLeft
      if (after !== before) {
        track.scrollLeft += after - before
      }

      track.style.scrollSnapType = prevSnap
      track.style.scrollBehavior = prevBehavior

      if (lockOverflow) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (trackRef.current) {
              trackRef.current.style.overflowX = ''
            }
          })
        })
      }
    },
    [canLoop],
  )

  const scrollToDomIndex = useCallback(
    (targetDomIndex, { instant = false } = {}) => {
      const track = trackRef.current
      if (!track) return
      const targetEl = track.children[targetDomIndex]
      if (!targetEl) return

      const targetLeft =
        targetEl.offsetLeft - (track.clientWidth - targetEl.offsetWidth) / 2
      const useInstant = instant || prefersReducedMotion()

      scrollIdRef.current += 1
      pendingTargetRef.current = targetDomIndex
      requestStartScrollRef.current = Math.round(track.scrollLeft)
      setIndex(targetDomIndex)

      track.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: useInstant ? 'auto' : 'smooth',
      })

      if (useInstant) {
        pendingTargetRef.current = null
        requestStartScrollRef.current = null
        settledIndexRef.current = targetDomIndex
        inDomOrderTripRef.current = false
        syncParking(targetDomIndex, { lockOverflow: false })
      }
    },
    [syncParking],
  )

  const stepBy = useCallback(
    (delta, { userInitiated = true } = {}) => {
      const track = trackRef.current
      if (!track || slideCount <= 1) return

      if (userInitiated) {
        hasInteractedRef.current = true
      }

      if (inDomOrderTripRef.current) {
        heldDirectionRef.current = delta
        return
      }

      const baseDomIndex =
        pendingTargetRef.current !== null
          ? pendingTargetRef.current
          : getNearestDomIndex(track)

      if (canLoop) {
        const visual = getVisualOrder(track)
        const visualPos = visual.findIndex((item) => item.domIndex === baseDomIndex)
        if (visualPos === -1) return
        const nextVisualPos = visualPos + delta
        if (nextVisualPos < 0 || nextVisualPos >= visual.length) return
        const target = visual[nextVisualPos]
        scrollToDomIndex(target.domIndex)
      } else {
        const nextDomIndex = (baseDomIndex + delta + slideCount) % slideCount
        scrollToDomIndex(nextDomIndex)
      }
    },
    [canLoop, getNearestDomIndex, getVisualOrder, scrollToDomIndex, slideCount],
  )

  const goToMarker = useCallback(
    (targetDomIndex) => {
      const track = trackRef.current
      if (!track || slideCount <= 1) return
      hasInteractedRef.current = true

      const currentDomIndex =
        pendingTargetRef.current !== null
          ? pendingTargetRef.current
          : getNearestDomIndex(track)

      if (targetDomIndex === currentDomIndex) return

      if (canLoop) {
        inDomOrderTripRef.current = true
        syncParking(currentDomIndex, { lockOverflow: false, clearParking: true })
      }
      scrollToDomIndex(targetDomIndex)
    },
    [canLoop, getNearestDomIndex, scrollToDomIndex, slideCount, syncParking],
  )

  // Initial layout, sibling-count() fallback, and initial parking
  useEffect(() => {
    const track = trackRef.current
    setIndex(0)
    settledIndexRef.current = 0
    pendingTargetRef.current = null
    requestStartScrollRef.current = null
    hasInteractedRef.current = false
    inDomOrderTripRef.current = false
    heldDirectionRef.current = 0
    setAnnouncement('')

    if (!track || slideCount <= 1) return

    if (
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      !CSS.supports('order: sibling-count()')
    ) {
      track.style.setProperty('--children-count', String(slideCount))
    } else {
      track.style.removeProperty('--children-count')
    }

    if (canLoop) {
      track.style.removeProperty('--current')
      track.scrollLeft = 0
      syncParking(0, { lockOverflow: false })
    } else {
      track.style.removeProperty('--current')
      track.scrollLeft = 0
    }
  }, [slideCount, canLoop, syncParking])

  // Track live scroll + settled scrollend (with debounced fallback)
  useEffect(() => {
    const track = trackRef.current
    if (!track || slideCount <= 1) return undefined

    let rafId = 0
    let fallbackTimer = 0
    const supportsScrollEnd = 'onscrollend' in window

    function handleSettled(settledScrollId) {
      if (settledScrollId !== scrollIdRef.current) return
      const currentLeft = Math.round(track.scrollLeft)
      if (
        pendingTargetRef.current !== null &&
        requestStartScrollRef.current !== null &&
        currentLeft === requestStartScrollRef.current &&
        getNearestDomIndex(track) !== pendingTargetRef.current
      ) {
        return
      }

      const nearest = getNearestDomIndex(track)
      pendingTargetRef.current = null
      requestStartScrollRef.current = null

      const replayDelta = heldDirectionRef.current
      heldDirectionRef.current = 0
      inDomOrderTripRef.current = false

      if (canLoop) {
        syncParking(nearest, { lockOverflow: replayDelta === 0 })
      }

      setIndex((prev) => (prev === nearest ? prev : nearest))

      if (nearest !== settledIndexRef.current) {
        settledIndexRef.current = nearest
        if (hasInteractedRef.current) {
          setAnnouncement(`Slide ${nearest + 1} of ${slideCount}`)
        }
      }

      if (replayDelta !== 0) {
        stepBy(replayDelta, { userInitiated: true })
      }
    }

    function onScroll() {
      if (pendingTargetRef.current === null) {
        hasInteractedRef.current = true
        if (!rafId) {
          rafId = requestAnimationFrame(() => {
            rafId = 0
            if (pendingTargetRef.current !== null) return
            const nearest = getNearestDomIndex(track)
            setIndex((prev) => (prev === nearest ? prev : nearest))
          })
        }
      }

      if (!supportsScrollEnd) {
        clearTimeout(fallbackTimer)
        const idAtScroll = scrollIdRef.current
        fallbackTimer = setTimeout(() => handleSettled(idAtScroll), 140)
      }
    }

    function onScrollEnd() {
      handleSettled(scrollIdRef.current)
    }

    track.addEventListener('scroll', onScroll, { passive: true })
    if (supportsScrollEnd) {
      track.addEventListener('scrollend', onScrollEnd)
    }

    return () => {
      track.removeEventListener('scroll', onScroll)
      if (supportsScrollEnd) {
        track.removeEventListener('scrollend', onScrollEnd)
      }
      if (rafId) cancelAnimationFrame(rafId)
      clearTimeout(fallbackTimer)
    }
  }, [canLoop, getNearestDomIndex, slideCount, stepBy, syncParking])

  // Auto-scroll smoothly every 5 seconds
  useEffect(() => {
    if (slideCount <= 1 || paused) return undefined
    const timer = setTimeout(() => {
      stepBy(1, { userInitiated: false })
    }, 5000)
    return () => clearTimeout(timer)
  }, [slideCount, index, paused, stepBy])

  if (loading) {
    return (
      <section className="hero-section" aria-busy="true" aria-label="Loading promotions">
        <div className="hero-slide hero-slide-skeleton" />
      </section>
    )
  }

  if (!slideCount) {
    return (
      <section className="hero-section" aria-label="Promotions">
        <div className="hero-slide hero-slide-empty">
          <div className="hero-empty-copy">
            <p className="hero-pill">123GAMES</p>
            <h2 className="hero-title">Welcome to the lobby</h2>
            <p className="hero-subtitle">
              Your wallet, history, and account tools live here. Hero banners will appear once
              they are published from Admin.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      className="hero-section"
      aria-roledescription="carousel"
      aria-label="Promotions"
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
    >
      {slideCount > 1 ? (
        <div className="hero-controls">
          <button
            type="button"
            className="hero-nav hero-nav-prev"
            aria-label="Previous banner"
            onClick={() => stepBy(-1)}
          >
            <IconChevronLeft />
          </button>
          <button
            type="button"
            className="hero-nav hero-nav-next"
            aria-label="Next banner"
            onClick={() => stepBy(1)}
          >
            <IconChevronRight />
          </button>
        </div>
      ) : null}

      <div
        ref={trackRef}
        className={`hero-track ${canLoop ? 'is-loopable' : ''}`}
        tabIndex={slideCount > 1 ? 0 : undefined}
        role="group"
        aria-label="Banner slides"
      >
        {slides.map((slide, i) => {
          const desktopImage = slide.image || slide.mobileImage || ''
          const mobileImage = slide.mobileImage || slide.image || ''
          const altText = slide.title || `Promotional banner ${i + 1}`

          const mediaContent = desktopImage ? (
            <picture className="hero-picture">
              {mobileImage && mobileImage !== desktopImage ? (
                <source media="(max-width: 768px)" srcSet={mobileImage} />
              ) : null}
              <img
                src={desktopImage}
                alt={altText}
                className="hero-image"
                fetchPriority={i === 0 ? 'high' : 'low'}
                loading={i === 0 ? undefined : 'lazy'}
              />
            </picture>
          ) : (
            <div className="hero-image hero-image-fallback" role="img" aria-label={altText} />
          )

          return (
            <article
              key={slide._id || slide.id || i}
              className="hero-slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slideCount}`}
            >
              <div className="hero-media">
                {slide.ctaUrl ? (
                  <a
                    href={slide.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hero-link"
                    aria-label={altText}
                  >
                    {mediaContent}
                  </a>
                ) : (
                  mediaContent
                )}
              </div>
            </article>
          )
        })}
      </div>

      <p className="hero-sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {slideCount > 1 ? (
        <nav className="hero-dots" aria-label="Choose a banner">
          {slides.map((slide, i) => (
            <button
              key={slide._id || slide.id || i}
              type="button"
              aria-current={i === index ? 'true' : undefined}
              aria-label={`Show banner ${i + 1} of ${slideCount}`}
              className={`hero-dot ${i === index ? 'is-active' : ''}`}
              onClick={() => goToMarker(i)}
            />
          ))}
        </nav>
      ) : null}
    </section>
  )
}
