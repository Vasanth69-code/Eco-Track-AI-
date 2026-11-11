import api from './apiService';
import { API_BASE } from '../config/constants';

export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);

// Google OAuth login - redirects to backend
export const googleLogin = () => {
  window.location.href = `${API_BASE}/auth/google`;
};

// Session-based Google auth (legacy)
export const googleSession = (sessionId) => api.post('/auth/google/session', { sessionId });

export const getMe = () => api.get('/auth/me');
export const updateVehicle = (data) => api.put('/auth/vehicle', data);
export const logout = () => api.post('/auth/logout');

export const calculateRoute = (data) => api.post('/routes/calculate', data);
export const geocodeAddress = (address) => api.get('/routes/geocode', { params: { address } });
export const getPlaceSuggestions = async (query) => {
  if (!query || query.trim().length < 3) return [];
  try {
    const res = await api.get('/routes/autocomplete', { params: { q: query.trim() } });
    if (res.data?.data && Array.isArray(res.data.data)) {
      return res.data.data;
    }
  } catch (err) {
    console.warn('[Autocomplete] Backend note, falling back to direct Photon OSM:', err.message);
  }

  // Direct client-side OSM Photon fallback
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query.trim())}&limit=7`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.features)) {
        return data.features.map(f => {
          const p = f.properties || {};
          const coords = f.geometry?.coordinates || [];
          const name = p.name || p.city || p.country;
          const secondaryParts = [p.city && p.city !== name ? p.city : null, p.state, p.country].filter(Boolean);
          const secondaryText = secondaryParts.join(', ');
          return {
            id: `photon-${p.osm_id || Math.random()}`,
            name,
            secondaryText,
            displayName: secondaryText ? `${name}, ${secondaryText}` : name,
            city: p.city || null,
            state: p.state || null,
            country: p.country || null,
            lat: coords[1],
            lng: coords[0],
          };
        }).filter(item => item.name && item.lat && item.lng);
      }
    }
  } catch (fallbackErr) {
    console.warn('[Autocomplete] Photon client fallback failed:', fallbackErr.message);
  }

  return [];
};

export const saveTrip = (data) => api.post('/trips', data);
export const getTrips = (params) => api.get('/trips', { params });
export const getTripById = (id) => api.get(`/trips/${id}`);
export const deleteTrip = (id) => api.delete(`/trips/${id}`);
export const getTripStats = () => api.get('/trips/stats');

export const getNearbyStations = (params) => api.get('/stations', { params });
export const getStationsByBbox = (params) => api.get('/stations/bbox', { params });
export const getStationsAlongCorridor = (data) => api.post('/stations/corridor', data);

export const runWeatherSimulation = (data) => api.post('/simulations/weather', data);
export const runTrafficSimulation = (data) => api.post('/simulations/traffic', data);
export const runBatteryDegradation = (data) => api.post('/simulations/battery-degradation', data);

export const getVehicles = (params) => api.get('/vehicles', { params });
export const getVehicleById = (id) => api.get(`/vehicles/${id}`);

// Share
export const createShare = (data) => api.post('/share', data);
export const getShareByToken = (token) => api.get(`/share/${token}`);
