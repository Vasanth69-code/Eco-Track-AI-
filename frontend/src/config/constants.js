const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5500';

export const API_BASE = `${BACKEND_URL}/api`;

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  ROUTE_PLANNER: '/route-planner',
  TRIP_RESULTS: '/trip-results',
  CHARGING_STATIONS: '/charging-stations',
  SIMULATIONS: '/simulations',
  HISTORY: '/history',
  PROFILE: '/profile',
  VEHICLES: '/vehicles',
  COMPARE_EVS: '/compare-evs',
  AUTH_CALLBACK: '/auth/callback',
};

export const DEFAULT_VEHICLE = {
  name: 'Tata Nexon EV Max',
  batteryCapacityKwh: 40.5,
  usableBatteryPct: 90,
  efficiencyKwhPer100km: 15,
  minReserveSocPct: 15,
  targetChargeSocPct: 80,
  chargingPowerKw: 50,
  electricityRatePerKwh: 8,
};

export const MAP_CENTER = { lat: 20.5937, lng: 78.9629 };
export const MAP_ZOOM = 5;

export const CURRENCY = { symbol: '₹', code: 'INR' };
