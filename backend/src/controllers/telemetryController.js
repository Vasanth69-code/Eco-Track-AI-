const { normalizeTelemetry, generateSimulatedTelemetry } = require('../services/telemetryService');
const evVehicles = require('../data/evVehicles');
const { success, error } = require('../utils/responseHelper');

const normalize = async (req, res) => {
  try {
    const payload = req.body || {};
    const normalized = normalizeTelemetry(payload);
    return success(res, normalized, 'Telemetry normalized successfully');
  } catch (err) {
    return error(res, `Telemetry normalization failed: ${err.message}`, 400);
  }
};

const simulateStream = async (req, res) => {
  try {
    const { vehicleId, speedKmh, gradientPct, ambientTempC, hvacActive, progressRatio, customSoc } = req.query;
    const vehicle = evVehicles.find(v => v.id === vehicleId) || evVehicles[0];

    const telemetry = generateSimulatedTelemetry(vehicle, {
      speedKmh: speedKmh ? parseFloat(speedKmh) : 60,
      gradientPct: gradientPct ? parseFloat(gradientPct) : 1.2,
      ambientTempC: ambientTempC ? parseFloat(ambientTempC) : 26,
      hvacActive: hvacActive !== 'false',
      progressRatio: progressRatio ? parseFloat(progressRatio) : 0.25,
      customSoc: customSoc ? parseFloat(customSoc) : null,
    });

    return success(res, telemetry, 'Simulated telemetry generated');
  } catch (err) {
    return error(res, `Telemetry simulation failed: ${err.message}`, 500);
  }
};

const getCapabilities = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const vehicle = evVehicles.find(v => v.id === vehicleId) || evVehicles[0];

    const brand = (vehicle.brand || '').toLowerCase();
    let oemApiProvider = 'Smartcar Standardized EV Telematics';
    let packNominalVoltageV = 350;
    if (brand.includes('tata')) {
      oemApiProvider = 'Tata ZConnect Cloud Telematics API';
      packNominalVoltageV = 350;
    } else if (brand.includes('tesla')) {
      oemApiProvider = 'Tesla Fleet API & Vehicle Command';
      packNominalVoltageV = 400;
    } else if (brand.includes('hyundai')) {
      oemApiProvider = 'Hyundai Bluelink Connected Car API';
      packNominalVoltageV = 400;
    } else if (brand.includes('kia')) {
      oemApiProvider = 'Kia Connect EV Telematics';
      packNominalVoltageV = 800;
    } else if (brand.includes('mg')) {
      oemApiProvider = 'MG i-SMART Cloud API';
      packNominalVoltageV = 380;
    } else if (brand.includes('mahindra')) {
      oemApiProvider = 'Mahindra Me4U EV Telematics';
      packNominalVoltageV = 350;
    }

    const capabilities = {
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      supportsBleObd: true,
      supportsOemCloud: true,
      obdProtocol: 'ISO 15765-4 (CAN 11-bit / 500k baud)',
      supportedPids: [
        { pid: '01 2F', name: 'State of Charge (%)' },
        { pid: '01 0D', name: 'Vehicle Speed (km/h)' },
        { pid: '01 05', name: 'Battery / Coolant Temp (°C)' },
        { pid: '01 42', name: 'Control Module / Pack Voltage (V)' },
        { pid: '01 5B', name: 'Battery State of Health (%)' },
        { pid: '22 11 54', name: 'Instantaneous Power Draw (kW)' },
        { pid: '22 11 56', name: 'HVAC Power Draw (kW)' },
      ],
      oemApiProvider,
      packNominalVoltageV,
      curbWeightKg: vehicle.segment === 'SUV' ? 1700 : 1500,
    };

    return success(res, capabilities, 'Vehicle telematics capabilities retrieved');
  } catch (err) {
    return error(res, `Failed to retrieve capabilities: ${err.message}`, 500);
  }
};

module.exports = {
  normalize,
  simulateStream,
  getCapabilities,
};
