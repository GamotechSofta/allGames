import { Router } from 'express'
import { handleSeamlessCallback } from '../controllers/seamless.controller.js'

const router = Router()

router.post('/', handleSeamlessCallback)
router.post('/callback', handleSeamlessCallback)

export default router
