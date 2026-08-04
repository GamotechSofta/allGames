import { Router } from 'express'
import { adminRequired, adminLogin } from '../middleware/adminAuth.js'
import {
  addGame,
  deleteGame,
  listGames,
  toggleGame,
  updateGameLaunchUrl,
} from '../controllers/game.controller.js'
import { addPlayer, listPlayers } from '../controllers/player.controller.js'

const router = Router()

router.post('/login', adminLogin)
router.post('/game/add', adminRequired, addGame)
router.get('/game/list', adminRequired, listGames)
router.put('/game/toggle', adminRequired, toggleGame)
router.put('/game/launch-url', adminRequired, updateGameLaunchUrl)
router.delete('/game/delete', adminRequired, deleteGame)
router.post('/player/add', adminRequired, addPlayer)
router.get('/player/list', adminRequired, listPlayers)

export default router
