import { Router } from 'express'
import { adminRequired, adminLogin } from '../middleware/adminAuth.js'
import {
  addPlayer,
  creditPlayer,
  debitPlayer,
  listPlayers,
  updatePlayerWallet,
  togglePlayerSuspension,
  adminPlayerHistory,
} from '../controllers/player.controller.js'
import {
  addHeroBanner,
  deleteHeroBanner,
  listHeroBanners,
  toggleHeroBanner,
  updateHeroBanner,
} from '../controllers/heroBanner.controller.js'

const router = Router()

router.post('/login', adminLogin)
router.post('/player/add', adminRequired, addPlayer)
router.post('/player/credit', adminRequired, creditPlayer)
router.post('/player/debit', adminRequired, debitPlayer)
router.post('/player/wallet', adminRequired, updatePlayerWallet)
router.put('/player/wallet', adminRequired, updatePlayerWallet)
router.post('/player/suspend', adminRequired, togglePlayerSuspension)
router.put('/player/suspend', adminRequired, togglePlayerSuspension)
router.get('/player/history', adminRequired, adminPlayerHistory)
router.get('/player/list', adminRequired, listPlayers)

router.get('/hero-banners', adminRequired, listHeroBanners)
router.post('/hero-banners', adminRequired, addHeroBanner)
router.put('/hero-banners/:id', adminRequired, updateHeroBanner)
router.put('/hero-banners/:id/toggle', adminRequired, toggleHeroBanner)
router.delete('/hero-banners/:id', adminRequired, deleteHeroBanner)

export default router

