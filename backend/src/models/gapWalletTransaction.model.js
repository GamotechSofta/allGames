import mongoose from 'mongoose'

const gapWalletTransactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true, trim: true, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['DEBIT', 'CREDIT', 'ROLLBACK', 'debit', 'credit', 'rollback'],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS' },
    balanceAfter: { type: Number, required: true, min: 0 },
    gameId: { type: String, default: '', trim: true, index: true },
    roundId: { type: String, default: '', trim: true, index: true },
    originalTransactionId: { type: String, default: '', trim: true, index: true },
    rolledBack: { type: Boolean, default: false, index: true },
    rawPayload: { type: mongoose.Schema.Types.Mixed, default: null },
    requestMeta: { type: mongoose.Schema.Types.Mixed, default: null },
    provider: { type: String, default: 'GAP', trim: true },
    remarks: { type: String, default: '', trim: true },
  },
  { timestamps: true },
)

gapWalletTransactionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 })

export const GapWalletTransaction =
  mongoose.models.GapWalletTransaction ||
  mongoose.model('GapWalletTransaction', gapWalletTransactionSchema)
