const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema({
  token: { type: String, unique: true, required: true, index: true },
  tripData: { type: Object, required: true },
  vehicle: { type: Object },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  viewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

shareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Share', shareSchema);
