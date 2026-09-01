import { Router } from 'express'
import { adminRequired, adminLogin } from '../middleware/adminAuth.js'
import {
  addGame,
  deleteGame,
  listGames,
  toggleGame,
  updateGameLaunchUrl,
  adminPlayerGameHistory,
} from '../controllers/game.controller.js'
import {
  addPlayer,
  creditPlayer,
  debitPlayer,
  listPlayers,
  updatePlayerWallet,
} from '../controllers/player.controller.js'

const router = Router()

router.post('/login', adminLogin)
router.post('/game/add', adminRequired, addGame)
router.get('/game/list', adminRequired, listGames)
router.put('/game/toggle', adminRequired, toggleGame)
router.put('/game/launch-url', adminRequired, updateGameLaunchUrl)
router.delete('/game/delete', adminRequired, deleteGame)
router.post('/player/add', adminRequired, addPlayer)
router.post('/player/credit', adminRequired, creditPlayer)
router.post('/player/debit', adminRequired, debitPlayer)
router.post('/player/wallet', adminRequired, updatePlayerWallet)
router.put('/player/wallet', adminRequired, updatePlayerWallet)
router.get('/player/history', adminRequired, adminPlayerGameHistory)
router.get('/player/list', adminRequired, listPlayers)

export default router
