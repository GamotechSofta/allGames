import mongoose from 'mongoose'

const heroBannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '', trim: true },
    pill: { type: String, default: '', trim: true },
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile'],
      default: 'desktop',
      index: true,
    },
    image: { type: String, required: true, trim: true },
    mobileImage: { type: String, default: '', trim: true },
    ctaLabel: { type: String, default: '', trim: true },
    ctaUrl: { type: String, default: '', trim: true },
    sortOrder: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)

heroBannerSchema.index({ status: 1, deviceType: 1, sortOrder: 1, createdAt: -1 })

heroBannerSchema.pre('save', function () {
  if (this.isModified('status') || this.isNew) {
    this.isActive = this.status === 'active'
  }
})

export const HeroBanner =
  mongoose.models.HeroBanner || mongoose.model('HeroBanner', heroBannerSchema)
