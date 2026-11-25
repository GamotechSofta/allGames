import { Router } from 'express'
import { listEnabledGames } from '../controllers/enabledGames.controller.js'

const router = Router()

router.get('/', listEnabledGames)

export default router
