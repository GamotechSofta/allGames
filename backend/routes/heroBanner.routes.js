import { Router } from 'express'
import { listActiveHeroBanners } from '../controllers/heroBanner.controller.js'

const router = Router()

router.get('/', listActiveHeroBanners)
router.get('/list', listActiveHeroBanners)

export default router
