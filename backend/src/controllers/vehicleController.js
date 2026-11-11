const evVehicles = require('../data/evVehicles');
const { success, error } = require('../utils/responseHelper');

const enrichVehicleWithTelematics = (v) => {
  const brand = (v.brand || '').toLowerCase();

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
  } else if (brand.includes('porsche') || brand.includes('audi')) {
    oemApiProvider = 'Porsche Connect / Audi MMI API';
    packNominalVoltageV = 800;
  }

  return {
    ...v,
    telematicsSupport: {
      supportsBleObd: true,
      supportsOemCloud: true,
      obdProtocol: 'ISO 15765-4 (CAN 11-bit / 500k)',
      obdPidMap: 'Standard EV ELM327',
      oemApiProvider,
      packNominalVoltageV,
      curbWeightKg: v.segment === 'SUV' ? 1700 : v.segment === 'Compact SUV' ? 1550 : 1450,
      realtimePidsSupported: ['SoC %', 'Pack Voltage (V)', 'Instant Power (kW)', 'Coolant Temp (°C)', 'HVAC Load (kW)', 'State of Health %'],
    },
  };
};

const getAllVehicles = (req, res) => {
  const { brand, segment, search } = req.query;
  let filtered = evVehicles.map(enrichVehicleWithTelematics);

  if (brand) filtered = filtered.filter(v => v.brand.toLowerCase() === brand.toLowerCase());
  if (segment) filtered = filtered.filter(v => v.segment.toLowerCase() === segment.toLowerCase());
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.brand.toLowerCase().includes(q) ||
      v.segment.toLowerCase().includes(q)
    );
  }

  const brands = [...new Set(evVehicles.map(v => v.brand))];
  const segments = [...new Set(evVehicles.map(v => v.segment))];

  return success(res, { vehicles: filtered, total: filtered.length, brands, segments }, 'Vehicles retrieved');
};

const getVehicleById = (req, res) => {
  const vehicle = evVehicles.find(v => v.id === req.params.id);
  if (!vehicle) return error(res, 'Vehicle not found', 404);
  return success(res, enrichVehicleWithTelematics(vehicle), 'Vehicle retrieved');
};

module.exports = { getAllVehicles, getVehicleById };

