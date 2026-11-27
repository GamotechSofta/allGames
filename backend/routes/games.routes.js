import { Router } from 'express'
import { listGames } from '../controllers/games.controller.js'

const router = Router()

router.get('/', listGames)

export default router
