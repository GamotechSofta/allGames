import { Router } from 'express'
import { authRequired } from '../auth.js'
import { createGameToken, launchGame, listGames } from '../controllers/games.controller.js'

const router = Router()

router.get('/', listGames)
router.post('/token', authRequired, createGameToken)
router.post('/launch', authRequired, launchGame)
router.post('/launch/:gid', authRequired, launchGame)

export default router
