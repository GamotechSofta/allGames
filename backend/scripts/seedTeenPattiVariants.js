import 'dotenv/config'
import mongoose from 'mongoose'
import { Game } from '../models/game.model.js'

await mongoose.connect(process.env.MONGODB_URI)

const variants = [
  {
    gameId: 'TEENPATTI',
    name: 'Teen Patti Classic',
    title: 'Teen Patti Classic',
    launchUrl: 'https://www.doormart.shop/public?variant=classic',
    provider: 'DIRECT',
    status: 'active',
    isActive: true,
    image: 'https://images.unsplash.com/photo-1541278107931-e006523892df?auto=format&fit=crop&w=1200&q=80',
  },
  {
    gameId: 'TEENPATTI_AK47',
    name: 'Teen Patti AK47',
    title: 'Teen Patti AK47',
    launchUrl: 'https://www.doormart.shop/public?variant=ak47',
    provider: 'DIRECT',
    status: 'active',
    isActive: true,
    image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    gameId: 'TEENPATTI_MUFLIS',
    name: 'Teen Patti Muflis',
    title: 'Teen Patti Muflis',
    launchUrl: 'https://www.doormart.shop/public?variant=muflis',
    provider: 'DIRECT',
    status: 'active',
    isActive: true,
    image: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=1200&q=80',
  },
  {
    gameId: 'TEENPATTI_FLIPPER',
    name: 'Teen Patti Flipper',
    title: 'Teen Patti Flipper',
    launchUrl: 'https://www.doormart.shop/public?variant=flipper',
    provider: 'DIRECT',
    status: 'active',
    isActive: true,
    image: 'https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    gameId: 'TEENPATTI_JHANDU',
    name: 'Teen Patti Jhandu',
    title: 'Teen Patti Jhandu',
    launchUrl: 'https://www.doormart.shop/public?variant=jhandu',
    provider: 'DIRECT',
    status: 'active',
    isActive: true,
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
  },
]

for (const v of variants) {
  await Game.findOneAndUpdate(
    { gameId: v.gameId },
    { $set: v },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
}

const allGames = await Game.find({ status: 'active' }).select('name gameId provider launchUrl status').lean()
console.log('Active games in DB:', JSON.stringify(allGames, null, 2))
await mongoose.disconnect()
