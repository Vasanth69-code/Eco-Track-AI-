const { 
  getStationsInBbox, 
  getStationsNearLocation, 
  getStationsAlongRouteCorridor 
} = require('../services/overpassService');
const { getNearbyStations } = require('../services/stationService');
const { success, error } = require('../utils/responseHelper');

/**
 * GET /api/stations
 * Query charging stations near a specific point with a given radius (km)
 */
const getStations = async (req, res) => {
  try {
    const { lat, lng, distance = 15, maxResults = 40 } = req.query;
    if (!lat || !lng) {
      return error(res, 'Latitude (lat) and Longitude (lng) are required', 400);
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(distance);
    const limit = parseInt(maxResults, 10);

    // 1. First priority: Real OpenStreetMap Overpass stations
    try {
      const stations = await getStationsNearLocation(latitude, longitude, radiusKm, limit);
      if (stations && stations.length > 0) {
        return success(res, stations, 'OpenStreetMap stations retrieved successfully');
      }
    } catch (osmErr) {
      console.warn('[StationController] Overpass API query note, trying live EV directory:', osmErr.message);
    }

    // 2. Real fallback: Query TomTom / OCM live EV directory (100% genuine real stations, no mock)
    const liveStations = await getNearbyStations(latitude, longitude, radiusKm, limit);
    return success(res, liveStations, `Retrieved ${liveStations.length} real charging stations`);
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * GET /api/stations/bbox
 * Query charging stations within a map bounding box [south, west, north, east]
 */
const getStationsByBbox = async (req, res) => {
  try {
    const { south, west, north, east } = req.query;
    if (south === undefined || west === undefined || north === undefined || east === undefined) {
      return error(res, 'Bounding box parameters [south, west, north, east] are required', 400);
    }

    const stations = await getStationsInBbox(
      parseFloat(south),
      parseFloat(west),
      parseFloat(north),
      parseFloat(east)
    );

    return success(res, stations, `Retrieved ${stations.length} OpenStreetMap charging stations in visible area`);
  } catch (err) {
    return error(res, err.message, err.message.includes('too large') ? 400 : 500);
  }
};

/**
 * POST /api/stations/corridor
 * Query charging stations along a route corridor
 */
const getStationsCorridor = async (req, res) => {
  try {
    const { waypoints, maxDistanceKm = 8, vehicle } = req.body;
    if (!waypoints || !Array.isArray(waypoints) || waypoints.length === 0) {
      return error(res, 'Array of route waypoints is required', 400);
    }

    const stations = await getStationsAlongRouteCorridor(
      waypoints,
      parseFloat(maxDistanceKm) || 8,
      vehicle
    );

    return success(res, stations, `Retrieved ${stations.length} charging stations along route corridor`);
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getStations, getStationsByBbox, getStationsCorridor };
