const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  normalizeOverpassElement,
  parsePowerKW,
  parseConnectors,
  parseSocketCount,
  validateBbox,
  haversineKm,
} = require('../src/services/overpassService');

// ==========================================
// MOCK DATA FIXTURES (Clearly labeled as mock)
// ==========================================

const MOCK_NODE_FULL = {
  type: 'node',
  id: 101,
  lat: 13.0827,
  lon: 80.2707,
  tags: {
    amenity: 'charging_station',
    name: 'EcoRoute Super Hub',
    operator: 'Tata Power',
    brand: 'Tata Power EZ',
    maxpower: '120 kW',
    capacity: '4',
    access: 'yes',
    fee: 'yes',
    opening_hours: '24/7',
    'socket:type2_combo': '2',
    'socket:type2': '2',
  },
};

const MOCK_WAY_WITH_CENTER = {
  type: 'way',
  id: 202,
  center: { lat: 12.9716, lon: 77.5946 },
  tags: {
    amenity: 'charging_station',
    operator: 'Jio-bp pulse',
    'socket:type2_combo': '4',
    'socket:type2_combo:output': '60kW',
    access: 'customers',
  },
};

const MOCK_RELATION_WITH_CENTER = {
  type: 'relation',
  id: 303,
  center: { lat: 19.0760, lon: 72.8777 },
  tags: {
    amenity: 'charging_station',
    name: 'Mumbai EV Mega Park',
  },
};

const MOCK_NODE_MINIMAL_MISSING_METADATA = {
  type: 'node',
  id: 404,
  lat: 28.6139,
  lon: 77.2090,
  tags: {
    amenity: 'charging_station',
    // Missing name, operator, capacity, maxpower, connectors
  },
};

const MOCK_ELEMENT_INVALID_COORDS = {
  type: 'node',
  id: 505,
  lat: 'invalid',
  lon: null,
  tags: { amenity: 'charging_station' },
};

// ==========================================
// TEST SUITE
// ==========================================

describe('Overpass Service - Data Normalization & Tag Parsing', () => {

  test('Normalizes complete node element accurately without fabricating data', () => {
    const result = normalizeOverpassElement(MOCK_NODE_FULL);

    assert.strictEqual(result.id, 'node-101');
    assert.strictEqual(result.source, 'OpenStreetMap');
    assert.strictEqual(result.name, 'EcoRoute Super Hub');
    assert.strictEqual(result.hasCustomName, true);
    assert.strictEqual(result.latitude, 13.0827);
    assert.strictEqual(result.longitude, 80.2707);
    assert.strictEqual(result.operator, 'Tata Power');
    assert.strictEqual(result.chargingPowerKW, 120);
    assert.strictEqual(result.socketCount, 4);
    assert.strictEqual(result.access, 'yes');
    assert.strictEqual(result.fee, 'yes');
    assert.strictEqual(result.openingHours, '24/7');
    assert.strictEqual(result.elementType, 'node');
    assert.strictEqual(result.osmId, 101);
    assert.strictEqual(result.availability, 'unknown', 'Availability must be unknown for OSM mapped records');
    assert.ok(result.lastFetchedAt);
    assert.strictEqual(result.connectors.length, 2);
  });

  test('Normalizes way element using center coordinates', () => {
    const result = normalizeOverpassElement(MOCK_WAY_WITH_CENTER);

    assert.strictEqual(result.id, 'way-202');
    assert.strictEqual(result.latitude, 12.9716);
    assert.strictEqual(result.longitude, 77.5946);
    assert.strictEqual(result.name, 'Unnamed Charging Station', 'Missing name defaults cleanly without inventing fake names');
    assert.strictEqual(result.hasCustomName, false);
    assert.strictEqual(result.operator, 'Jio-bp pulse');
    assert.strictEqual(result.chargingPowerKW, 60, 'Parsed power from socket output tag');
    assert.strictEqual(result.access, 'customers');
  });

  test('Normalizes relation element using center coordinates', () => {
    const result = normalizeOverpassElement(MOCK_RELATION_WITH_CENTER);

    assert.strictEqual(result.id, 'relation-303');
    assert.strictEqual(result.latitude, 19.076);
    assert.strictEqual(result.longitude, 72.8777);
    assert.strictEqual(result.name, 'Mumbai EV Mega Park');
    assert.strictEqual(result.operator, null);
    assert.strictEqual(result.chargingPowerKW, null);
    assert.strictEqual(result.socketCount, null);
  });

  test('Handles stations with missing technical specifications gracefully', () => {
    const result = normalizeOverpassElement(MOCK_NODE_MINIMAL_MISSING_METADATA);

    assert.strictEqual(result.id, 'node-404');
    assert.strictEqual(result.name, 'Unnamed Charging Station');
    assert.strictEqual(result.operator, null);
    assert.strictEqual(result.chargingPowerKW, null);
    assert.strictEqual(result.socketCount, null);
    assert.deepStrictEqual(result.connectors, []);
    assert.strictEqual(result.access, null);
    assert.strictEqual(result.availability, 'unknown');
  });

  test('Discards elements with invalid or missing coordinates', () => {
    const result = normalizeOverpassElement(MOCK_ELEMENT_INVALID_COORDS);
    assert.strictEqual(result, null);
  });

  test('Parses power correctly from various formats', () => {
    assert.strictEqual(parsePowerKW({ maxpower: '50 kW' }), 50);
    assert.strictEqual(parsePowerKW({ maxpower: '22kW' }), 22);
    assert.strictEqual(parsePowerKW({ maxpower: '150' }), 150);
    assert.strictEqual(parsePowerKW({ 'socket:type2_combo:output': '60kW' }), 60);
    assert.strictEqual(parsePowerKW({ maxpower: 'unknown' }), null);
    assert.strictEqual(parsePowerKW({}), null);
  });

  test('Parses connector counts and types accurately', () => {
    const tags = {
      'socket:type2_combo': '2',
      'socket:chademo': '1',
      'socket:type2': 'no',
    };
    const connectors = parseConnectors(tags);
    assert.strictEqual(connectors.length, 2);
    assert.strictEqual(connectors[0].type, 'CCS 2 (Combo)');
    assert.strictEqual(connectors[0].count, 2);
    assert.strictEqual(connectors[1].type, 'CHAdeMO');
    assert.strictEqual(connectors[1].count, 1);
  });

  test('Parses socket count correctly from capacity or socket sum', () => {
    assert.strictEqual(parseSocketCount({ capacity: '6' }, []), 6);
    assert.strictEqual(parseSocketCount({ charging_stations: '3' }, []), 3);
    assert.strictEqual(parseSocketCount({}, [{ count: 2 }, { count: 3 }]), 5);
    assert.strictEqual(parseSocketCount({}, []), null);
  });
});

describe('Overpass Service - Validation & Geospatial Math', () => {

  test('Validates bounding box coordinates within allowable limits', () => {
    const valid = validateBbox(12.9, 77.5, 13.1, 77.7);
    assert.strictEqual(valid.s, 12.9);
    assert.strictEqual(valid.w, 77.5);
    assert.strictEqual(valid.n, 13.1);
    assert.strictEqual(valid.e, 77.7);
  });

  test('Rejects invalid latitude/longitude ranges', () => {
    assert.throws(() => validateBbox(-95, 0, 10, 0), /Latitude out of range/);
    assert.throws(() => validateBbox(0, -190, 0, 10), /Longitude out of range/);
    assert.throws(() => validateBbox(20, 0, 10, 0), /South coordinate cannot be greater/);
  });

  test('Rejects excessively large bounding boxes to protect Overpass servers', () => {
    assert.throws(() => validateBbox(0, 0, 10, 10), /Requested map area is too large/);
  });

  test('Calculates Haversine distance with high accuracy', () => {
    // Delhi (28.6139, 77.2090) to Agra (27.1767, 78.0081) is approx 180-190 km straight-line
    const dist = haversineKm(28.6139, 77.2090, 27.1767, 78.0081);
    assert.ok(dist > 175 && dist < 195, `Expected distance around 180-190km, got ${dist}`);
  });
});

describe('Overpass Service - Deduplication and Filtering', () => {

  test('Deduplicates elements by elementType and osmId', () => {
    const duplicateElements = [
      MOCK_NODE_FULL,
      MOCK_NODE_FULL, // Exact duplicate
      { ...MOCK_NODE_FULL, lat: 13.0828 }, // Duplicate ID with slight shift
    ];

    const map = new Map();
    for (const el of duplicateElements) {
      const normalized = normalizeOverpassElement(el);
      if (normalized && !map.has(normalized.id)) {
        map.set(normalized.id, normalized);
      }
    }

    assert.strictEqual(map.size, 1, 'Duplicate ID should be collapsed to single entry');
  });

  test('Filtering by connector excludes non-matching stations', () => {
    const stations = [
      normalizeOverpassElement(MOCK_NODE_FULL), // Has CCS 2 and Type 2
      normalizeOverpassElement(MOCK_WAY_WITH_CENTER), // Has CCS 2
      normalizeOverpassElement(MOCK_NODE_MINIMAL_MISSING_METADATA), // No connectors
    ];

    const ccsOnly = stations.filter(s =>
      s.connectors.some(c => c.type.toLowerCase().includes('ccs 2'))
    );
    assert.strictEqual(ccsOnly.length, 2);

    const type2Only = stations.filter(s =>
      s.connectors.some(c => c.type.toLowerCase().includes('type 2'))
    );
    assert.strictEqual(type2Only.length, 1);
  });

  test('Filtering by minimum power excludes low or unknown power stations', () => {
    const stations = [
      normalizeOverpassElement(MOCK_NODE_FULL), // 120 kW
      normalizeOverpassElement(MOCK_WAY_WITH_CENTER), // 60 kW
      normalizeOverpassElement(MOCK_NODE_MINIMAL_MISSING_METADATA), // null kW
    ];

    const fastChargers = stations.filter(s => (s.chargingPowerKW || 0) >= 50);
    assert.strictEqual(fastChargers.length, 2);

    const ultraFastChargers = stations.filter(s => (s.chargingPowerKW || 0) >= 100);
    assert.strictEqual(ultraFastChargers.length, 1);
  });
});
