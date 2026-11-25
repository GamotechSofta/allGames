import 'dotenv/config'
import mongoose from 'mongoose'
import { HeroBanner } from '../models/heroBanner.model.js'

await mongoose.connect(process.env.MONGODB_URI)

const defaults = [
  {
    title: 'Welcome to 123Games',
    subtitle: 'Your wallet, history, and account tools in one place.',
    pill: 'NEW LOBBY',
    image:
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1600&q=80',
    mobileImage:
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80',
    ctaLabel: 'View Profile',
    ctaUrl: '',
    sortOrder: 0,
    status: 'active',
    isActive: true,
  },
  {
    title: 'Track every credit & debit',
    subtitle: 'Open History anytime for a clear wallet statement.',
    pill: 'WALLET INSIGHTS',
    image:
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=80',
    mobileImage:
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=900&q=80',
    ctaLabel: 'Open History',
    ctaUrl: '',
    sortOrder: 1,
    status: 'active',
    isActive: true,
  },
]

const count = await HeroBanner.countDocuments()
if (count === 0) {
  await HeroBanner.insertMany(defaults)
  console.log(`Seeded ${defaults.length} hero banners`)
} else {
  console.log(`Skipped seed — ${count} banner(s) already exist`)
}

const all = await HeroBanner.find({})
  .select('title status sortOrder image')
  .sort({ sortOrder: 1 })
  .lean()
console.log(JSON.stringify(all, null, 2))
await mongoose.disconnect()
