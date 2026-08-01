import { Router } from 'express'
import { authRequired } from '../auth.js'
import { listActiveGames, launchGame, playerGameHistory } from '../controllers/game.controller.js'

const router = Router()

router.get('/list', listActiveGames)
router.get('/history', authRequired, playerGameHistory)
router.post('/launch', authRequired, launchGame)

export default router
