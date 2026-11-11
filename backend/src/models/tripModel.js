const mongoose = require('mongoose');

const chargingStopSchema = new mongoose.Schema({
  stationId: String,
  stationName: String,
  location: { lat: Number, lng: Number },
  address: String,
  chargingPowerKw: Number,
  arrivalSocPct: Number,
  departureSocPct: Number,
  energyAddedKwh: Number,
  chargingTimeMin: Number,
  costUsd: Number,
}, { _id: false });

const segmentSchema = new mongoose.Schema({
  from: String,
  to: String,
  distanceKm: Number,
  durationMin: Number,
  energyKwh: Number,
  socAfterPct: Number,
}, { _id: false });

const tripSchema = new mongoose.Schema({
  tripId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  origin: { address: String, lat: Number, lng: Number },
  destination: { address: String, lat: Number, lng: Number },
  vehicle: {
    name: String,
    batteryCapacityKwh: Number,
    usableBatteryPct: Number,
    efficiencyKwhPer100km: Number,
    minReserveSocPct: Number,
    targetChargeSocPct: Number,
    chargingPowerKw: Number,
    electricityRatePerKwh: Number,
  },
  routeGeometry: { type: Object },
  segments: [segmentSchema],
  chargingStops: [chargingStopSchema],
  summary: {
    totalDistanceKm: Number,
    totalDrivingTimeMin: Number,
    totalChargingTimeMin: Number,
    totalTripTimeMin: Number,
    totalEnergyKwh: Number,
    totalCostUsd: Number,
    initialSocPct: Number,
    finalSocPct: Number,
    numberOfChargingStops: Number,
  },
  weatherData: { type: Object, default: null },
  trafficData: { type: Object, default: null },
  status: { type: String, enum: ['planned', 'completed', 'cancelled'], default: 'planned' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Trip', tripSchema);
