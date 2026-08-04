import mongoose from 'mongoose'

const gameSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    gameId: { type: String, required: true, unique: true, trim: true, index: true },
    provider: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    title: { type: String, default: '', trim: true },
    image: { type: String, default: '', trim: true },
    /** Base URL for platform launch (query params appended at launch time). */
    launchUrl: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)

gameSchema.index({ status: 1, createdAt: -1 })

gameSchema.pre('save', function () {
  if (this.isModified('status')) {
    this.isActive = this.status === 'active'
  } else if (this.isModified('isActive')) {
    this.status = this.isActive ? 'active' : 'inactive'
  }
  if (!this.title) this.title = this.name || ''
})

export const Game = mongoose.models.Game || mongoose.model('Game', gameSchema)
