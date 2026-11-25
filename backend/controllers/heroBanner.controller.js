import { HeroBanner } from '../models/heroBanner.model.js'

function normalizeUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    return url.toString()
  } catch {
    return ''
  }
}

function toBannerPayload(body = {}) {
  const title = String(body.title || '').trim()
  const image = normalizeUrl(body.image) || String(body.image || '').trim()
  const mobileImage =
    normalizeUrl(body.mobileImage) || String(body.mobileImage || '').trim()
  const ctaUrl = normalizeUrl(body.ctaUrl) || String(body.ctaUrl || '').trim()
  const status = body.status === 'inactive' ? 'inactive' : 'active'
  const sortOrder = Number.isFinite(Number(body.sortOrder))
    ? Number(body.sortOrder)
    : 0

  return {
    title,
    subtitle: String(body.subtitle || '').trim(),
    pill: String(body.pill || '').trim(),
    image,
    mobileImage,
    ctaLabel: String(body.ctaLabel || '').trim(),
    ctaUrl,
    sortOrder,
    status,
    isActive: status === 'active',
  }
}

/** GET /api/hero-banners — public active banners for the lobby */
export async function listActiveHeroBanners(_req, res) {
  try {
    const banners = await HeroBanner.find({
      $or: [{ status: 'active' }, { isActive: true }],
    })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean()

    return res.json({ success: true, data: banners })
  } catch (error) {
    console.error('[HERO] list active error', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to list hero banners',
    })
  }
}

/** GET /api/admin/hero-banners — all banners for admin */
export async function listHeroBanners(_req, res) {
  try {
    const banners = await HeroBanner.find({})
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean()
    return res.json({ success: true, data: banners })
  } catch (error) {
    console.error('[HERO] admin list error', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to list hero banners',
    })
  }
}

/** POST /api/admin/hero-banners */
export async function addHeroBanner(req, res) {
  try {
    const payload = toBannerPayload(req.body)
    if (!payload.title || !payload.image) {
      return res.status(400).json({
        success: false,
        message: 'title and image are required',
      })
    }

    const banner = await HeroBanner.create(payload)
    return res.status(201).json({
      success: true,
      data: banner,
      message: 'Hero banner added',
    })
  } catch (error) {
    console.error('[HERO] add error', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to add hero banner',
    })
  }
}

/** PUT /api/admin/hero-banners/:id */
export async function updateHeroBanner(req, res) {
  try {
    const id = String(req.params.id || '').trim()
    if (!id) {
      return res.status(400).json({ success: false, message: 'id is required' })
    }

    const banner = await HeroBanner.findById(id)
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' })
    }

    const payload = toBannerPayload({ ...banner.toObject(), ...req.body })
    if (!payload.title || !payload.image) {
      return res.status(400).json({
        success: false,
        message: 'title and image are required',
      })
    }

    Object.assign(banner, payload)
    await banner.save()

    return res.json({
      success: true,
      data: banner,
      message: 'Hero banner updated',
    })
  } catch (error) {
    console.error('[HERO] update error', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update hero banner',
    })
  }
}

/** PUT /api/admin/hero-banners/:id/toggle */
export async function toggleHeroBanner(req, res) {
  try {
    const id = String(req.params.id || req.body?.id || '').trim()
    if (!id) {
      return res.status(400).json({ success: false, message: 'id is required' })
    }

    const banner = await HeroBanner.findById(id)
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' })
    }

    if (req.body?.status === 'active' || req.body?.status === 'inactive') {
      banner.status = req.body.status
    } else {
      banner.status = banner.status === 'active' ? 'inactive' : 'active'
    }
    banner.isActive = banner.status === 'active'
    await banner.save()

    return res.json({ success: true, data: banner })
  } catch (error) {
    console.error('[HERO] toggle error', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to toggle hero banner',
    })
  }
}

/** DELETE /api/admin/hero-banners/:id */
export async function deleteHeroBanner(req, res) {
  try {
    const id = String(req.params.id || req.body?.id || '').trim()
    if (!id) {
      return res.status(400).json({ success: false, message: 'id is required' })
    }

    const banner = await HeroBanner.findByIdAndDelete(id)
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' })
    }

    return res.json({
      success: true,
      data: banner,
      message: 'Hero banner deleted',
    })
  } catch (error) {
    console.error('[HERO] delete error', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete hero banner',
    })
  }
}
