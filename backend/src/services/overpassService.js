const axios = require('axios');

/**
 * Public Overpass API endpoints (in order of priority for automatic failover).
 * Completely free, no API key required.
 */
const DEFAULT_OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const OVERPASS_ENDPOINTS = (process.env.OVERPASS_API_URL 
  ? [process.env.OVERPASS_API_URL, ...DEFAULT_OVERPASS_ENDPOINTS]
  : DEFAULT_OVERPASS_ENDPOINTS
);

// In-memory cache for bounding box queries with TTL to avoid repeated queries and respect OSM policies
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generates a cache key from rounded coordinates (approx 1 km precision)
 */
const getCacheKey = (s, w, n, e) => {
  return `bbox_${s.toFixed(2)}_${w.toFixed(2)}_${n.toFixed(2)}_${e.toFixed(2)}`;
};

/**
 * Safely parses numeric kW charging power from OSM tags
 */
const parsePowerKW = (tags = {}) => {
  if (!tags) return null;

  // Direct maxpower tag (e.g., "50 kW", "50kW", "150", "22.5")
  if (tags.maxpower) {
    const match = String(tags.maxpower).match(/(\d+(?:\.\d+)?)/);
    if (match) return parseFloat(match[1]);
  }

  // Check socket outputs (e.g., "socket:type2_combo:output" = "50kW")
  let maxOutput = 0;
  for (const [key, value] of Object.entries(tags)) {
    if (key.includes(':output') || key.startsWith('charge:')) {
      const match = String(value).match(/(\d+(?:\.\d+)?)/);
      if (match) {
        const val = parseFloat(match[1]);
        if (val > maxOutput) maxOutput = val;
      }
    }
  }

  return maxOutput > 0 ? maxOutput : null;
};

/**
 * Safely parses socket/connector types from OSM tags
 */
const parseConnectors = (tags = {}) => {
  if (!tags) return [];
  const connectors = [];

  const knownSockets = [
    { key: 'socket:type2_combo', label: 'CCS 2 (Combo)' },
    { key: 'socket:type1_combo', label: 'CCS 1 (Combo)' },
    { key: 'socket:type2', label: 'Type 2 (AC)' },
    { key: 'socket:chademo', label: 'CHAdeMO' },
    { key: 'socket:type1', label: 'Type 1 (J1772)' },
    { key: 'socket:tesla_supercharger', label: 'Tesla Supercharger' },
    { key: 'socket:tesla_destination', label: 'Tesla Destination' },
    { key: 'socket:schuko', label: 'Schuko (Household)' },
    { key: 'socket:type3', label: 'Type 3' },
    { key: 'socket:bs1363', label: '3-Pin UK' },
  ];

  for (const { key, label } of knownSockets) {
    if (tags[key] && tags[key] !== 'no') {
      const count = parseInt(tags[key], 10);
      connectors.push({
        type: label,
        rawTag: key,
        count: !isNaN(count) && count > 0 ? count : 1,
        outputKW: tags[`${key}:output`] ? parsePowerKW({ maxpower: tags[`${key}:output`] }) : null,
      });
    }
  }

  // Also check generic 'socket:*' tags not in predefined list
  for (const [k, v] of Object.entries(tags)) {
    if (k.startsWith('socket:') && !k.includes(':') && v !== 'no') {
      const alreadyAdded = connectors.some(c => c.rawTag === k);
      if (!alreadyAdded) {
        const cleanType = k.replace('socket:', '').replace(/_/g, ' ').toUpperCase();
        const count = parseInt(v, 10);
        connectors.push({
          type: cleanType,
          rawTag: k,
          count: !isNaN(count) && count > 0 ? count : 1,
          outputKW: tags[`${k}:output`] ? parsePowerKW({ maxpower: tags[`${k}:output`] }) : null,
        });
      }
    }
  }

  return connectors;
};

/**
 * Safely parses socket/port count
 */
const parseSocketCount = (tags = {}, connectors = []) => {
  if (!tags) return null;

  if (tags.capacity) {
    const parsed = parseInt(tags.capacity, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  if (tags.charging_stations) {
    const parsed = parseInt(tags.charging_stations, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // If connector counts are mapped, sum them
  const connectorSum = connectors.reduce((acc, c) => acc + (c.count || 1), 0);
  if (connectorSum > 0) return connectorSum;

  return null;
};

/**
 * Normalizes an Overpass API element into the standard application structure.
 * Guaranteed format as required by the specification:
 * {
 *   id, source, name, latitude, longitude, operator, connectors,
 *   chargingPowerKW, socketCount, access, fee, openingHours, elementType,
 *   osmId, availability, lastFetchedAt, rawTags
 * }
 */
const normalizeOverpassElement = (element) => {
  if (!element) return null;

  const elementType = element.type; // 'node' | 'way' | 'relation'
  const osmId = element.id;
  const tags = element.tags || {};

  // For nodes, coordinates are at lat/lon. For ways and relations, Overpass returns 'center'
  let lat = null;
  let lon = null;
  if (elementType === 'node') {
    lat = typeof element.lat === 'number' ? element.lat : parseFloat(element.lat);
    lon = typeof element.lon === 'number' ? element.lon : parseFloat(element.lon);
  } else if (element.center) {
    lat = typeof element.center.lat === 'number' ? element.center.lat : parseFloat(element.center.lat);
    lon = typeof element.center.lon === 'number' ? element.center.lon : parseFloat(element.center.lon);
  }

  if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
    return null; // Skip elements without valid coordinates
  }

  const connectors = parseConnectors(tags);
  const chargingPowerKW = parsePowerKW(tags);
  const socketCount = parseSocketCount(tags, connectors);

  // Station name: Never invent names, return null if not available
  const name = tags.name || tags['name:en'] || null;
  const operator = tags.operator || tags.brand || tags.network || null;
  const access = tags.access || (tags['motor_vehicle:conditional'] ? 'conditional' : null);
  const fee = tags.fee || null;
  const openingHours = tags.opening_hours || null;

  return {
    id: `${elementType}-${osmId}`,
    source: 'OpenStreetMap',
    name: name || 'Unnamed Charging Station',
    hasCustomName: Boolean(name),
    latitude: parseFloat(lat.toFixed(6)),
    longitude: parseFloat(lon.toFixed(6)),
    operator: operator,
    connectors: connectors,
    chargingPowerKW: chargingPowerKW,
    socketCount: socketCount,
    access: access,
    fee: fee,
    openingHours: openingHours,
    elementType: elementType,
    osmId: osmId,
    osmUrl: `https://www.openstreetmap.org/${elementType}/${osmId}`,
    availability: 'unknown', // Overpass maps infrastructure, not live occupancy
    lastFetchedAt: new Date().toISOString(),
    rawTags: tags,
  };
};

/**
 * Executes an Overpass QL query with failover and timeout protection
 */
const executeOverpassQuery = async (query) => {
  let lastError = null;

  // Use top 2 endpoints with 4500ms timeout for rapid failover and prevent long freezes
  for (const endpoint of OVERPASS_ENDPOINTS.slice(0, 2)) {
    try {
      const response = await axios({
        method: 'POST',
        url: endpoint,
        data: 'data=' + encodeURIComponent(query),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'EcoRouteAI/1.0 (ev-route-planner; contact@ecoroute.app)',
        },
        timeout: 4500, // 4.5s fast timeout
      });

      if (response.data && Array.isArray(response.data.elements)) {
        return response.data.elements;
      }
    } catch (err) {
      console.warn(`[Overpass] Request failed on ${endpoint}: ${err.message}. Trying next endpoint...`);
      lastError = err;
    }
  }

  throw new Error(`Overpass API unavailable across tested endpoints. ${lastError ? lastError.message : ''}`);
};

/**
 * Validates bounding box coordinates
 */
const validateBbox = (south, west, north, east) => {
  const s = parseFloat(south);
  const w = parseFloat(west);
  const n = parseFloat(north);
  const e = parseFloat(east);

  if (isNaN(s) || isNaN(w) || isNaN(n) || isNaN(e)) {
    throw new Error('Invalid coordinates: south, west, north, east must be numbers.');
  }

  if (s < -90 || s > 90 || n < -90 || n > 90) {
    throw new Error('Latitude out of range [-90, 90].');
  }

  if (w < -180 || w > 180 || e < -180 || e > 180) {
    throw new Error('Longitude out of range [-180, 180].');
  }

  if (s > n) {
    throw new Error('South coordinate cannot be greater than North coordinate.');
  }

  // Protection against excessively large bounding boxes (> 4.0 sq degrees)
  const latSpan = Math.abs(n - s);
  const lonSpan = Math.abs(e - w);
  if (latSpan * lonSpan > 9.0 || latSpan > 3.0 || lonSpan > 3.0) {
    throw new Error('Requested map area is too large. Please zoom in closer to discover charging stations.');
  }

  return { s, w, n, e };
};

/**
 * Queries charging stations in a bounding box using Overpass API
 */
const getStationsInBbox = async (south, west, north, east) => {
  const { s, w, n, e } = validateBbox(south, west, north, east);
  const cacheKey = getCacheKey(s, w, n, e);

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  // Exact query pattern specified in requirements
  const query = `[out:json][timeout:25];
(
  node["amenity"="charging_station"](${s},${w},${n},${e});
  way["amenity"="charging_station"](${s},${w},${n},${e});
  relation["amenity"="charging_station"](${s},${w},${n},${e});
);
out center tags;`;

  const rawElements = await executeOverpassQuery(query);

  // Normalize and deduplicate by id
  const stationMap = new Map();
  for (const el of rawElements) {
    const normalized = normalizeOverpassElement(el);
    if (normalized && !stationMap.has(normalized.id)) {
      stationMap.set(normalized.id, normalized);
    }
  }

  const results = Array.from(stationMap.values());

  // Store in cache
  cache.set(cacheKey, { timestamp: Date.now(), data: results });

  return results;
};

/**
 * Calculates haversine distance between two points in km
 */
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Queries charging stations around a center point within radiusKm
 */
const getStationsNearLocation = async (lat, lng, radiusKm = 15, maxResults = 50) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const radius = Math.min(Math.max(parseFloat(radiusKm) || 15, 1), 50);

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error('Invalid coordinates: lat and lng are required.');
  }

  // Calculate approximate bounding box from radius
  const latDelta = radius / 111.0;
  const lonDelta = radius / (111.0 * Math.cos(latitude * (Math.PI / 180)));

  const south = latitude - latDelta;
  const north = latitude + latDelta;
  const west = longitude - lonDelta;
  const east = longitude + lonDelta;

  const stationsInBox = await getStationsInBbox(south, west, north, east);

  // Calculate exact distance from center point and sort
  const withDistance = stationsInBox.map(st => ({
    ...st,
    distanceKm: parseFloat(haversineKm(latitude, longitude, st.latitude, st.longitude).toFixed(2)),
  })).filter(st => st.distanceKm <= radius * 1.25);

  withDistance.sort((a, b) => a.distanceKm - b.distanceKm);

  return withDistance.slice(0, maxResults);
};

/**
 * Calculates perpendicular/straight-line distance from point to a line segment
 */
const distanceToSegmentKm = (pLat, pLon, aLat, aLon, bLat, bLon) => {
  const dAB = haversineKm(aLat, aLon, bLat, bLon);
  if (dAB === 0) return haversineKm(pLat, pLon, aLat, aLon);

  // Vector projection parameter
  const t = Math.max(0, Math.min(1, (
    ((pLat - aLat) * (bLat - aLat) + (pLon - aLon) * (bLon - aLon)) /
    (Math.pow(bLat - aLat, 2) + Math.pow(bLon - aLon, 2) || 0.000001)
  )));

  const projLat = aLat + t * (bLat - aLat);
  const projLon = aLon + t * (bLon - aLon);

  return haversineKm(pLat, pLon, projLat, projLon);
};

/**
 * Queries stations along a route corridor (with perpendicular distance and progression)
 */
const getStationsAlongRouteCorridor = async (waypoints = [], maxDistanceKm = 8, vehicle = null) => {
  if (!waypoints || waypoints.length === 0) return [];

  // Compute bounding box around waypoints with buffer
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const wp of waypoints) {
    const lat = wp.lat !== undefined ? wp.lat : wp[1];
    const lon = wp.lng !== undefined ? wp.lng : wp[0];
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }

  const bufferDeg = (maxDistanceKm + 5) / 111.0;
  const south = Math.max(-90, minLat - bufferDeg);
  const north = Math.min(90, maxLat + bufferDeg);
  const west = Math.max(-180, minLon - bufferDeg);
  const east = Math.min(180, maxLon + bufferDeg);

  let stations = [];
  try {
    // Single bounded box query to avoid concurrent 429 rate limits
    stations = await getStationsInBbox(south, west, north, east);
  } catch (err) {
    console.warn('[Overpass Corridor] Overpass note, switching to TomTom live network:', err.message);
    return [];
  }

  // Calculate distance from each station to the route
  const corridorStations = [];
  for (const station of stations) {
    let minDistanceToRoute = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      const aLat = p1.lat !== undefined ? p1.lat : p1[1];
      const aLon = p1.lng !== undefined ? p1.lng : p1[0];
      const bLat = p2.lat !== undefined ? p2.lat : p2[1];
      const bLon = p2.lng !== undefined ? p2.lng : p2[0];

      const dist = distanceToSegmentKm(station.latitude, station.longitude, aLat, aLon, bLat, bLon);
      if (dist < minDistanceToRoute) {
        minDistanceToRoute = dist;
        closestIndex = i;
      }
    }

    if (minDistanceToRoute <= maxDistanceKm) {
      // Evaluate vehicle compatibility if vehicle is provided
      let compatibility = 'unknown';
      let compatibilityDetail = 'Connector specs not recorded in OpenStreetMap';

      if (station.connectors && station.connectors.length > 0) {
        const hasCCS2 = station.connectors.some(c => c.type.includes('CCS 2') || c.type.includes('Type 2'));
        if (hasCCS2) {
          compatibility = 'compatible';
          compatibilityDetail = 'Matches EV Type 2 / CCS-2 standard';
        } else {
          compatibility = 'incompatible';
          compatibilityDetail = 'Does not match standard CCS-2 connector';
        }
      }

      corridorStations.push({
        ...station,
        corridorDistanceKm: parseFloat(minDistanceToRoute.toFixed(2)),
        routeProgressPct: parseFloat(((closestIndex / Math.max(1, waypoints.length - 1)) * 100).toFixed(1)),
        compatibility,
        compatibilityDetail,
      });
    }
  }

  // Sort by progression along the route from origin to destination
  corridorStations.sort((a, b) => a.routeProgressPct - b.routeProgressPct);

  return corridorStations;
};

module.exports = {
  getStationsInBbox,
  getStationsNearLocation,
  getStationsAlongRouteCorridor,
  normalizeOverpassElement,
  parsePowerKW,
  parseConnectors,
  parseSocketCount,
  validateBbox,
  haversineKm,
  OVERPASS_ENDPOINTS,
};
