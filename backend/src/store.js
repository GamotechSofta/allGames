import mongoose from 'mongoose'

const playerSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
)

const walletSchema = new mongoose.Schema(
  {
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      unique: true,
      index: true,
    },
    balance: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
)

export const Player = mongoose.models.Player || mongoose.model('Player', playerSchema)
export const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', walletSchema)

export async function connectDb(uri) {
  if (!uri) throw new Error('MONGODB_URI is required')
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri)
  console.log('MongoDB connected')
}

export function findPlayerByPhone(phone) {
  return Player.findOne({ phone }).lean()
}

export function findPlayerById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null
  return Player.findById(id).lean()
}

export async function createPlayer({ phone, username, passwordHash, startingBalance = 0 }) {
  const player = await Player.create({ phone, username, passwordHash })
  await Wallet.create({ playerId: player._id, balance: startingBalance })
  return player.toObject()
}

export async function getWallet(playerId) {
  let wallet = await Wallet.findOne({ playerId }).lean()
  if (!wallet) {
    const created = await Wallet.create({ playerId, balance: 0 })
    wallet = created.toObject()
  }
  return wallet
}

export async function adjustWallet(playerId, delta) {
  const wallet = await Wallet.findOne({ playerId })
  if (!wallet) {
    const err = new Error('Wallet not found')
    err.code = 'WALLET_NOT_FOUND'
    throw err
  }

  const next = Number(wallet.balance) + Number(delta)
  if (next < 0) {
    const err = new Error('Insufficient balance')
    err.code = 'INSUFFICIENT_BALANCE'
    throw err
  }

  wallet.balance = next
  await wallet.save()
  return wallet.toObject()
}
