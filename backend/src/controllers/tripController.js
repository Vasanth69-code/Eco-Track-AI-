const { saveTrip, getUserTrips, getTripById, deleteTrip, getTripStats } = require('../services/tripService');
const { success, error } = require('../utils/responseHelper');

const createTrip = async (req, res) => {
  try {
    const trip = await saveTrip(req.user.userId, req.body);
    return success(res, trip, 'Trip saved', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const getTrips = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await getUserTrips(req.user?.userId || 'guest_user', parseInt(page), parseInt(limit));
    return success(res, result, 'Trips retrieved');
  } catch (err) {
    return success(res, { trips: [], total: 0, page: 1, pages: 0 }, 'Trips retrieved');
  }
};

const getTrip = async (req, res) => {
  try {
    const trip = await getTripById(req.params.id, req.user.userId);
    if (!trip) return error(res, 'Trip not found', 404);
    return success(res, trip, 'Trip retrieved');
  } catch (err) {
    return error(res, err.message);
  }
};

const removeTrip = async (req, res) => {
  try {
    const trip = await deleteTrip(req.params.id, req.user.userId);
    if (!trip) return error(res, 'Trip not found', 404);
    return success(res, null, 'Trip deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

const getStats = async (req, res) => {
  try {
    const stats = await getTripStats(req.user?.userId || 'guest_user');
    return success(res, stats, 'Stats retrieved');
  } catch (err) {
    return success(res, {
      totalTrips: 0,
      totalDistanceKm: 0,
      totalEnergyKwh: 0,
      totalCostUsd: 0,
      totalChargingStops: 0,
      avgDistanceKm: 0,
    }, 'Stats retrieved');
  }
};

module.exports = { createTrip, getTrips, getTrip, removeTrip, getStats };
