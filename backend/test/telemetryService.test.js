const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { decodeObdFrame, normalizeTelemetry, generateSimulatedTelemetry } = require('../src/services/telemetryService');
const { getElevationProfile } = require('../src/services/elevationService');

describe('Telemetry Service - OBD-II Hex Decoding & Normalization', () => {
  test('decodes Mode 01 PID 2F battery SoC correctly', () => {
    // 0x9E = 158. 158 * 100 / 255 = 62.0%
    const decoded = decodeObdFrame('41 2F 9E');
    assert.equal(decoded.parameter, 'socPct');
    assert.equal(decoded.value, 62.0);
  });

  test('decodes Mode 01 PID 0D vehicle speed correctly', () => {
    // 0x48 = 72 km/h
    const decoded = decodeObdFrame('41 0D 48');
    assert.equal(decoded.parameter, 'speedKmh');
    assert.equal(decoded.value, 72);
  });

  test('decodes Mode 01 PID 05 coolant/pack temp correctly', () => {
    // 0x44 = 68. 68 - 40 = 28 °C
    const decoded = decodeObdFrame('41 05 44');
    assert.equal(decoded.parameter, 'batteryTempC');
    assert.equal(decoded.value, 28);
  });

  test('decodes Mode 01 PID 42 pack voltage correctly', () => {
    // A=0x01, B=0x68 -> (256*1 + 104)/1000 = 0.360 kV = 360 V (or scaled)
    const decoded = decodeObdFrame('41 42 01 68');
    assert.equal(decoded.parameter, 'packVoltageV');
    assert.ok(decoded.value > 0);
  });

  test('normalizes raw OBD frames array into unified telemetry object', () => {
    const normalized = normalizeTelemetry({
      rawFrames: ['41 2F C8', '41 0D 3C', '41 05 43'],
      vehicleModel: 'Tata Nexon EV Max',
    });

    assert.equal(normalized.source, 'obd2_bluetooth');
    assert.ok(normalized.socPct > 75);
    assert.equal(normalized.speedKmh, 60);
    assert.equal(normalized.batteryTempC, 27);
    assert.ok(normalized.thermalStatus);
  });

  test('generates simulated telemetry for testing without physical dongle', () => {
    const simulated = generateSimulatedTelemetry({
      id: 'tata-nexon-ev-max',
      name: 'Tata Nexon EV Max',
      batteryCapacityKwh: 40.5,
      efficiencyKwhPer100km: 15,
      usableBatteryPct: 90,
    }, {
      speedKmh: 65,
      gradientPct: 2.0,
      hvacActive: true,
    });

    assert.ok(simulated.socPct > 0 && simulated.socPct <= 100);
    assert.ok(simulated.instantPowerKw > 0);
    assert.ok(simulated.packVoltageV >= 300);
    assert.equal(simulated.speedKmh, 65);
  });
});

describe('Elevation Service - Terrain Physics & Energy Calculations', () => {
  test('calculates ascent, descent, and regenerative recovery', async () => {
    const coords = [
      [77.5946, 12.9716],
      [77.0, 12.6],
      [76.6394, 12.2958],
    ];

    const profile = await getElevationProfile(coords, 140, 1600);
    assert.ok(profile.elevations.length >= 3);
    assert.ok(profile.metrics.totalAscentM >= 0);
    assert.ok(profile.metrics.totalDescentM >= 0);
    assert.ok(profile.energyImpact.uphillExtraDemandKwh >= 0);
    assert.ok(profile.energyImpact.downhillRegenRecoveryKwh >= 0);
    assert.ok(profile.energyImpact.terrainEfficiencyFactor > 0);
  });
});

