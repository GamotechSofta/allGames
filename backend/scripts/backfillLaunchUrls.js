import 'dotenv/config'
import mongoose from 'mongoose'
import { Game } from '../models/game.model.js'

await mongoose.connect(process.env.MONGODB_URI)

const variantUrls = {
  TEENPATTI: 'https://www.doormart.shop/public?variant=classic',
  TEENPATTI_AK47: 'https://www.doormart.shop/public?variant=ak47',
  TEENPATTI_MUFLIS: 'https://www.doormart.shop/public?variant=muflis',
  TEENPATTI_FLIPPER: 'https://www.doormart.shop/public?variant=flipper',
  TEENPATTI_JHANDU: 'https://www.doormart.shop/public?variant=jhandu',
}

for (const [gameId, launchUrl] of Object.entries(variantUrls)) {
  await Game.updateOne(
    { gameId },
    { $set: { launchUrl, status: 'active', isActive: true } },
  )
}

const games = await Game.find({}).select('name gameId provider launchUrl status').lean()
console.log(JSON.stringify(games, null, 2))
await mongoose.disconnect()
