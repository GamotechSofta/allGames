import mongoose from 'mongoose'

const gameSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      index: true,
    },
    gameId: { type: String, required: true, trim: true, index: true },
    sessionId: { type: String, required: true, trim: true, index: true },
    launchUrl: { type: String, default: '', trim: true },
    provider: { type: String, default: 'GAP', trim: true },
    rawResponse: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
)

export const GameSession =
  mongoose.models.GameSession || mongoose.model('GameSession', gameSessionSchema)
