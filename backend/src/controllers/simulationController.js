const { getWeatherAtLocation, simulateWeatherImpact } = require('../services/weatherService');
const { getTrafficFlow, simulateTrafficImpact } = require('../services/trafficService');
const { calculateBatteryDegradation } = require('../utils/energyCalculator');
const { success, error } = require('../utils/responseHelper');

const weatherSimulation = async (req, res) => {
  try {
    const { lat, lng, baseEfficiency, batteryCapacityKwh, totalDistanceKm } = req.body;
    if (!lat || !lng || !baseEfficiency) return error(res, 'lat, lng, and baseEfficiency are required', 400);

    const weatherData = await getWeatherAtLocation(parseFloat(lat), parseFloat(lng));
    const impact = simulateWeatherImpact(parseFloat(baseEfficiency), parseFloat(batteryCapacityKwh || 75), weatherData);
    const extraEnergyKwh = totalDistanceKm ? parseFloat(((impact.adjustedEfficiency - baseEfficiency) * (totalDistanceKm / 100)).toFixed(2)) : null;

    return success(res, { weatherData, impact, extraEnergyKwh }, 'Weather simulation complete');
  } catch (err) {
    return error(res, err.message);
  }
};

const trafficSimulation = async (req, res) => {
  try {
    const { lat, lng, baseEfficiency, totalDistanceKm } = req.body;
    if (!lat || !lng || !baseEfficiency) return error(res, 'lat, lng, and baseEfficiency are required', 400);

    const trafficData = await getTrafficFlow(parseFloat(lat), parseFloat(lng));
    const impact = simulateTrafficImpact(parseFloat(baseEfficiency), parseFloat(totalDistanceKm || 100), trafficData);

    return success(res, { trafficData, impact }, 'Traffic simulation complete');
  } catch (err) {
    return error(res, err.message);
  }
};

const batteryDegradation = async (req, res) => {
  try {
    const { tripData } = req.body;
    if (!tripData) return error(res, 'tripData is required', 400);

    const result = calculateBatteryDegradation(tripData);
    return success(res, result, 'Battery degradation estimated');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { weatherSimulation, trafficSimulation, batteryDegradation };
