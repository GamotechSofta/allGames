import mongoose from 'mongoose'

const playerSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    passwordHash: { type: String, required: true },
    currency: { type: String, default: 'INR', trim: true },
  },
  { timestamps: true },
)

/** Wallet.balance is the single source of truth for GAP play. */
const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      unique: true,
      index: true,
    },
    // legacy alias kept for older documents
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      index: true,
      sparse: true,
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

function asObjectId(id) {
  return new mongoose.Types.ObjectId(String(id))
}

async function findWalletDoc(userId, session = null) {
  const oid = asObjectId(userId)
  const q = Wallet.findOne({ $or: [{ userId: oid }, { playerId: oid }] })
  return session ? q.session(session) : q
}

export async function createPlayer({ phone, username, passwordHash, startingBalance = 0 }) {
  const player = await Player.create({ phone, username, passwordHash })
  await Wallet.create({
    userId: player._id,
    playerId: player._id,
    balance: startingBalance,
  })
  return player.toObject()
}

export async function getWallet(userId, session = null) {
  let wallet = await findWalletDoc(userId, session)
  if (!wallet) {
    const created = new Wallet({
      userId: asObjectId(userId),
      playerId: asObjectId(userId),
      balance: 0,
    })
    if (session) await created.save({ session })
    else await created.save()
    wallet = created
  }
  // backfill userId on legacy docs
  if (!wallet.userId && wallet.playerId) {
    wallet.userId = wallet.playerId
    if (session) await wallet.save({ session })
    else await wallet.save()
  }
  return wallet.toObject ? wallet.toObject() : wallet
}

export async function adjustWallet(userId, delta, session = null) {
  const wallet = await findWalletDoc(userId, session)
  if (!wallet) {
    const err = new Error('Wallet not found')
    err.code = 'WALLET_NOT_FOUND'
    throw err
  }

  const next = Number(wallet.balance) + Number(delta)
  if (next < 0) {
    const err = new Error('Insufficient balance')
    err.code = 'INSUFFICIENT_BALANCE'
    err.currentBalance = Number(wallet.balance || 0)
    throw err
  }

  wallet.balance = next
  if (!wallet.userId) wallet.userId = wallet.playerId || asObjectId(userId)
  if (session) await wallet.save({ session })
  else await wallet.save()
  return wallet.toObject()
}
