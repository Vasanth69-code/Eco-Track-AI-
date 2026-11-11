const { v4: uuidv4 } = require('uuid');

/**
 * In-Memory Trip Store for Zero-DB Operation
 * Allows full trip creation, history, stats, and analytics without requiring MongoDB.
 */

const SEED_TRIPS = [
  {
    _id: 'trip_eco_001',
    tripId: 'trip_eco_001',
    userId: 'ecotrack_driver',
    origin: { address: 'Bengaluru, Karnataka', lat: 12.9716, lng: 77.5946 },
    destination: { address: 'Mysuru Palace, Mysuru', lat: 12.3051, lng: 76.6551 },
    vehicle: {
      name: 'Tata Nexon EV Max',
      batteryCapacityKwh: 40.5,
      usableBatteryPct: 90,
      efficiencyKwhPer100km: 15.2,
      minReserveSocPct: 15,
      targetChargeSocPct: 80,
      chargingPowerKw: 50,
      electricityRatePerKwh: 8.5,
    },
    routeGeometry: {
      type: 'LineString',
      coordinates: [
        [77.5946, 12.9716],
        [77.4000, 12.8000],
        [77.1000, 12.6000],
        [76.8500, 12.4500],
        [76.6551, 12.3051],
      ],
    },
    segments: [
      { from: 'Bengaluru', to: 'Mandya Highway Hub', distanceKm: 85, durationMin: 75, energyKwh: 13.5, socAfterPct: 58 },
      { from: 'Mandya Highway Hub', to: 'Mysuru Palace', distanceKm: 60, durationMin: 55, energyKwh: 9.8, socAfterPct: 52 },
    ],
    chargingStops: [
      {
        stationId: 'osm-mandya-fast',
        stationName: 'Mandya Highway EV Fast Charger (OSM)',
        location: { lat: 12.525, lng: 76.895 },
        address: 'Bangalore-Mysore Expy, Mandya',
        chargingPowerKw: 60,
        arrivalSocPct: 58,
        departureSocPct: 80,
        energyAddedKwh: 8.9,
        chargingTimeMin: 18,
        costUsd: 2.8,
      },
    ],
    summary: {
      totalDistanceKm: 145.2,
      totalDrivingTimeMin: 130,
      totalChargingTimeMin: 18,
      totalTripTimeMin: 148,
      totalEnergyKwh: 23.3,
      totalCostUsd: 4.25,
      initialSocPct: 95,
      finalSocPct: 52,
      numberOfChargingStops: 1,
    },
    weatherData: {
      temp: 26.5,
      feelsLike: 27.0,
      humidity: 58,
      windSpeed: 3.2,
      main: 'Clear',
      description: 'clear sky',
    },
    status: 'completed',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'trip_eco_002',
    tripId: 'trip_eco_002',
    userId: 'ecotrack_driver',
    origin: { address: 'Delhi, NCR', lat: 28.6139, lng: 77.2090 },
    destination: { address: 'Taj Mahal, Agra', lat: 27.1751, lng: 78.0421 },
    vehicle: {
      name: 'MG ZS EV Excite',
      batteryCapacityKwh: 50.3,
      usableBatteryPct: 92,
      efficiencyKwhPer100km: 16.5,
      minReserveSocPct: 15,
      targetChargeSocPct: 85,
      chargingPowerKw: 60,
      electricityRatePerKwh: 9.0,
    },
    routeGeometry: {
      type: 'LineString',
      coordinates: [
        [77.2090, 28.6139],
        [77.4500, 28.3000],
        [77.6500, 27.8000],
        [78.0421, 27.1751],
      ],
    },
    segments: [
      { from: 'Delhi', to: 'Yamuna Expressway Plaza', distanceKm: 120, durationMin: 95, energyKwh: 19.8, socAfterPct: 49 },
      { from: 'Yamuna Expressway Plaza', to: 'Agra', distanceKm: 90, durationMin: 70, energyKwh: 14.8, socAfterPct: 56 },
    ],
    chargingStops: [
      {
        stationId: 'osm-yamuna-expressway',
        stationName: 'Yamuna Expy Fast Charging Hub (OSM)',
        location: { lat: 27.915, lng: 77.720 },
        address: 'Yamuna Expressway Mile 65',
        chargingPowerKw: 80,
        arrivalSocPct: 49,
        departureSocPct: 85,
        energyAddedKwh: 16.5,
        chargingTimeMin: 22,
        costUsd: 5.10,
      },
    ],
    summary: {
      totalDistanceKm: 210.0,
      totalDrivingTimeMin: 165,
      totalChargingTimeMin: 22,
      totalTripTimeMin: 187,
      totalEnergyKwh: 34.6,
      totalCostUsd: 6.80,
      initialSocPct: 92,
      finalSocPct: 56,
      numberOfChargingStops: 1,
    },
    weatherData: {
      temp: 29.0,
      feelsLike: 30.2,
      humidity: 50,
      windSpeed: 2.8,
      main: 'Sunny',
      description: 'sunny weather',
    },
    status: 'completed',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// In-memory collection of trips
const inMemoryTrips = [...SEED_TRIPS];

/**
 * Saves a new trip in memory
 */
const saveTrip = async (userId, tripData) => {
  const tripId = `trip_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const newTrip = {
    _id: tripId,
    tripId,
    userId: userId || 'ecotrack_driver',
    ...tripData,
    status: tripData.status || 'planned',
    createdAt: new Date().toISOString(),
  };

  inMemoryTrips.unshift(newTrip);
  return newTrip;
};

/**
 * Retrieves all trips for a user (or all trips in zero-auth mode)
 */
const getUserTrips = async (userId, page = 1, limit = 20) => {
  // Return all trips or filtered by userId
  const filtered = inMemoryTrips.filter(
    t => !userId || t.userId === userId || t.userId === 'ecotrack_driver' || t.userId === 'guest_user'
  );

  const skip = (page - 1) * limit;
  const trips = filtered.slice(skip, skip + limit);
  const total = filtered.length;

  return {
    trips,
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
  };
};

/**
 * Retrieves a single trip by ID
 */
const getTripById = async (tripId, userId) => {
  return inMemoryTrips.find(t => t.tripId === tripId || t._id === tripId) || null;
};

/**
 * Deletes a trip by ID
 */
const deleteTrip = async (tripId, userId) => {
  const index = inMemoryTrips.findIndex(t => t.tripId === tripId || t._id === tripId);
  if (index !== -1) {
    const deleted = inMemoryTrips.splice(index, 1);
    return deleted[0];
  }
  return null;
};

/**
 * Aggregates analytics across all saved trips
 */
const getTripStats = async (userId) => {
  const trips = inMemoryTrips.filter(
    t => !userId || t.userId === userId || t.userId === 'ecotrack_driver' || t.userId === 'guest_user'
  );

  const totalTrips = trips.length;
  const totalDistanceKm = trips.reduce((s, t) => s + (t.summary?.totalDistanceKm || 0), 0);
  const totalEnergyKwh = trips.reduce((s, t) => s + (t.summary?.totalEnergyKwh || 0), 0);
  const totalCostUsd = trips.reduce((s, t) => s + (t.summary?.totalCostUsd || 0), 0);
  const totalChargingStops = trips.reduce((s, t) => s + (t.summary?.numberOfChargingStops || 0), 0);
  const avgDistanceKm = totalTrips > 0 ? totalDistanceKm / totalTrips : 0;
  // Average ICE car emits approx 120g CO2/km; EV charged from grid emits ~40g CO2/km eq.
  const co2SavedKg = (totalDistanceKm * 0.08);

  return {
    totalTrips,
    totalDistanceKm: parseFloat(totalDistanceKm.toFixed(1)),
    totalEnergyKwh: parseFloat(totalEnergyKwh.toFixed(1)),
    totalCostUsd: parseFloat(totalCostUsd.toFixed(2)),
    totalChargingStops,
    avgDistanceKm: parseFloat(avgDistanceKm.toFixed(1)),
    co2SavedKg: parseFloat(co2SavedKg.toFixed(1)),
  };
};

module.exports = { saveTrip, getUserTrips, getTripById, deleteTrip, getTripStats };
