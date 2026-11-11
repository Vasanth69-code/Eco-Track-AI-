const { planRoute, geocodeAddress, autocompletePlaces } = require('../services/routeService');
const { success, error } = require('../utils/responseHelper');

const calculateRoute = async (req, res) => {
  try {
    const { origin, destination, waypoints = [], vehicle, originCoords, destinationCoords } = req.body;
    const originInput = originCoords || origin;
    const destInput = destinationCoords || destination;

    if (!originInput || !destInput) return error(res, 'Origin and destination are required', 400);
    if (!vehicle) return error(res, 'Vehicle parameters are required', 400);

    const result = await planRoute(originInput, destInput, vehicle, waypoints);
    return success(res, result, 'Route calculated successfully');
  } catch (err) {
    return error(res, `Route calculation failed: ${err.message}`, 500);
  }
};

const geocode = async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) return error(res, 'Address is required', 400);
    const result = await geocodeAddress(address);
    return success(res, result, 'Geocoding successful');
  } catch (err) {
    return error(res, err.message, 404);
  }
};

const autocomplete = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length < 3) {
      return success(res, [], 'Query must be at least 3 characters');
    }
    const results = await autocompletePlaces(q.trim());
    return success(res, results, 'Place suggestions retrieved successfully');
  } catch (err) {
    return error(res, `Autocomplete failed: ${err.message}`, 500);
  }
};

module.exports = { calculateRoute, geocode, autocomplete };
