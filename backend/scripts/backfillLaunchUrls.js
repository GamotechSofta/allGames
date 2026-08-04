import 'dotenv/config'
import mongoose from 'mongoose'
import { Game } from '../models/game.model.js'

await mongoose.connect(process.env.MONGODB_URI)

await Game.updateOne(
  { gameId: 'TEENPATTI', $or: [{ launchUrl: { $exists: false } }, { launchUrl: '' }, { launchUrl: null }] },
  { $set: { launchUrl: 'https://www.doormart.shop/' } },
)

const games = await Game.find({}).select('name gameId provider launchUrl status').lean()
console.log(JSON.stringify(games, null, 2))
await mongoose.disconnect()
