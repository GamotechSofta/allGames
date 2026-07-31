import { Router } from 'express'
import { authRequired } from '../auth.js'
import { listActiveGames, launchGame } from '../controllers/game.controller.js'

const router = Router()

router.get('/list', listActiveGames)
router.post('/launch', authRequired, launchGame)

export default router
