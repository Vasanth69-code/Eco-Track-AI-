const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  passwordHash: { type: String },
  googleId: { type: String },
  picture: { type: String, default: '' },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  defaultVehicle: {
    name: { type: String, default: 'My EV' },
    batteryCapacityKwh: { type: Number, default: 40.5 },
    usableBatteryPct: { type: Number, default: 90 },
    efficiencyKwhPer100km: { type: Number, default: 15 },
    minReserveSocPct: { type: Number, default: 15 },
    targetChargeSocPct: { type: Number, default: 80 },
    chargingPowerKw: { type: Number, default: 50 },
    electricityRatePerKwh: { type: Number, default: 8 },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('User', userSchema);
