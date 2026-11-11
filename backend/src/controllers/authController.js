const { success, error } = require('../utils/responseHelper');

const DEFAULT_ECOTRACK_USER = {
  userId: 'ecotrack_driver',
  email: 'driver@ecotrack.ai',
  name: 'EcoTrack EV Driver',
  picture: '',
  authProvider: 'direct',
  defaultVehicle: {
    name: 'Tata Nexon EV Max',
    batteryCapacityKwh: 40.5,
    usableBatteryPct: 90,
    efficiencyKwhPer100km: 15,
    minReserveSocPct: 15,
    targetChargeSocPct: 80,
    chargingPowerKw: 50,
    electricityRatePerKwh: 8.5,
  },
};

let currentUserVehicle = { ...DEFAULT_ECOTRACK_USER.defaultVehicle };

const register = async (req, res) => {
  return success(res, { token: 'ecotrack_direct_token', user: DEFAULT_ECOTRACK_USER }, 'Registered successfully', 200);
};

const login = async (req, res) => {
  return success(res, { token: 'ecotrack_direct_token', user: DEFAULT_ECOTRACK_USER }, 'Logged in successfully', 200);
};

const googleAuth = (req, res) => {
  return res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
};

const googleCallback = (req, res) => {
  return res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
};

const googleSession = (req, res) => {
  return success(res, { token: 'ecotrack_direct_token', user: DEFAULT_ECOTRACK_USER }, 'Session active');
};

const getMe = async (req, res) => {
  return success(res, {
    ...DEFAULT_ECOTRACK_USER,
    defaultVehicle: currentUserVehicle,
  }, 'EcoTrack EV Driver profile retrieved');
};

const updateVehicle = async (req, res) => {
  currentUserVehicle = { ...currentUserVehicle, ...req.body };
  return success(res, currentUserVehicle, 'Vehicle settings updated successfully');
};

const logout = async (req, res) => {
  return success(res, null, 'Logged out successfully');
};

module.exports = {
  register,
  login,
  googleAuth,
  googleCallback,
  googleSession,
  getMe,
  updateVehicle,
  logout,
};
