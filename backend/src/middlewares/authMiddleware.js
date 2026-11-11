/**
 * Zero-Auth Driver Middleware
 * Automatically provides active EV driver profile without requiring login, signup, or database checks.
 */

const DEFAULT_ECOTRACK_DRIVER = {
  userId: 'ecotrack_driver',
  email: 'driver@ecotrack.ai',
  name: 'EcoTrack EV Driver',
  role: 'driver',
  authProvider: 'direct',
  defaultVehicle: {
    name: 'Tata Nexon EV Max',
    batteryCapacityKwh: 40.5,
    usableBatteryPct: 90,
    efficiencyKwhPer100km: 15.0,
    minReserveSocPct: 15,
    targetChargeSocPct: 80,
    chargingPowerKw: 50,
    electricityRatePerKwh: 8.5,
  },
};

const authMiddleware = (req, res, next) => {
  // Always supply the active EV Driver context seamlessly
  req.user = { ...DEFAULT_ECOTRACK_DRIVER };
  next();
};

module.exports = authMiddleware;
