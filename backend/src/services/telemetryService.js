/**
 * Telemetry Service: OBD-II Bluetooth & OEM Manufacturing API / Telematics Normalization
 * Supports standard ELM327 Bluetooth PIDs and OEM Cloud Telematics (Tata ZConnect, Tesla, Hyundai, Smartcar)
 */

// Standard OBD-II PID Definitions for EV / Hybrid Powertrains
const OBD_PIDS = {
  SOC_FUEL: '012F',           // Fuel / Battery State of Charge (0-100%)
  VEHICLE_SPEED: '010D',      // Vehicle Speed (km/h)
  COOLANT_TEMP: '0105',       // Coolant / Battery Temp (°C, formula: A - 40)
  CONTROL_MODULE_VOLT: '0142',// Control Module / Pack Voltage (formula: 256*A + B / 1000)
  HYBRID_BATTERY_LIFE: '015B',// Hybrid/EV Battery Pack Remaining Life / SoH %
  AMBIENT_AIR_TEMP: '0146',   // Ambient Air Temperature (°C, formula: A - 40)
  EV_BATTERY_CURRENT: '221154',// High Voltage Battery Current (Amps)
  EV_HVAC_POWER: '221156',    // HVAC Instantaneous Power (kW)
};

/**
 * Decode standard ELM327 OBD-II hex response frames
 * Example frame: "41 2F 9E" -> Mode 01 PID 2F -> value 0x9E (158) -> 158 * 100 / 255 = 62.0%
 */
const decodeObdFrame = (rawHex) => {
  if (!rawHex || typeof rawHex !== 'string') return null;
  const cleaned = rawHex.replace(/\s+/g, '').toUpperCase();

  // Mode 01 PID 2F (SoC / Fuel %)
  if (cleaned.startsWith('412F')) {
    const valHex = cleaned.slice(4, 6);
    const val = parseInt(valHex, 16);
    return { pid: '012F', parameter: 'socPct', value: parseFloat(((val * 100) / 255).toFixed(1)) };
  }

  // Mode 01 PID 0D (Speed km/h)
  if (cleaned.startsWith('410D')) {
    const valHex = cleaned.slice(4, 6);
    const val = parseInt(valHex, 16);
    return { pid: '010D', parameter: 'speedKmh', value: val };
  }

  // Mode 01 PID 05 (Battery/Coolant Temp °C)
  if (cleaned.startsWith('4105')) {
    const valHex = cleaned.slice(4, 6);
    const val = parseInt(valHex, 16) - 40;
    return { pid: '0105', parameter: 'batteryTempC', value: val };
  }

  // Mode 01 PID 42 (Pack Voltage)
  if (cleaned.startsWith('4142')) {
    const a = parseInt(cleaned.slice(4, 6), 16);
    const b = parseInt(cleaned.slice(6, 8), 16);
    const volts = (256 * a + b) / 1000;
    return { pid: '0142', parameter: 'packVoltageV', value: parseFloat(volts.toFixed(1)) };
  }

  // Mode 01 PID 5B (Remaining Pack Health % / SoH)
  if (cleaned.startsWith('415B')) {
    const valHex = cleaned.slice(4, 6);
    const val = parseInt(valHex, 16);
    return { pid: '015B', parameter: 'sohPct', value: parseFloat(((val * 100) / 255).toFixed(1)) };
  }

  return { pid: 'UNKNOWN', raw: rawHex };
};

/**
 * Normalizes telemetry from diverse vehicle sources:
 * - OBD-II Bluetooth Dongle (ELM327 BLE)
 * - OEM Manufacturing Cloud APIs (Tesla Fleet API, Tata ZConnect, Hyundai Bluelink, MG i-SMART, Smartcar)
 */
const normalizeTelemetry = (payload) => {
  const {
    source = 'obd2_bluetooth', // 'obd2_bluetooth' | 'oem_telematics' | 'smartcar' | 'manual'
    vehicleId,
    vehicleModel = 'Tata Nexon EV Max',
    provider = 'OBD-II ELM327 BLE Adapter',
    rawFrames = [],
    oemPayload = null,
    // Direct or fallback parameters
    socPct = 85,
    batteryTempC = 27.5,
    packVoltageV = 354.2,
    instantPowerKw = 16.4,
    hvacDrawKw = 1.1,
    speedKmh = 55,
    odometerKm = 14200,
    sohPct = 98.2,
    gearState = 'D',
    isCharging = false,
  } = payload;

  let normalized = {
    source,
    vehicleId: vehicleId || vehicleModel.toLowerCase().replace(/\s+/g, '-'),
    vehicleModel,
    provider,
    socPct: Math.min(100, Math.max(0, parseFloat(socPct))),
    batteryTempC: parseFloat(batteryTempC),
    packVoltageV: parseFloat(packVoltageV),
    instantPowerKw: parseFloat(instantPowerKw),
    hvacDrawKw: parseFloat(hvacDrawKw),
    speedKmh: Math.max(0, parseFloat(speedKmh)),
    odometerKm: parseFloat(odometerKm),
    sohPct: Math.min(100, Math.max(50, parseFloat(sohPct))),
    gearState,
    isCharging: Boolean(isCharging),
    timestamp: new Date().toISOString(),
    connectionStatus: 'connected',
    qualityScore: 98,
  };

  // If OBD frames provided, override with decoded frame values
  if (Array.isArray(rawFrames) && rawFrames.length > 0) {
    for (const frame of rawFrames) {
      const decoded = decodeObdFrame(frame);
      if (decoded && decoded.parameter) {
        normalized[decoded.parameter] = decoded.value;
      }
    }
    normalized.source = 'obd2_bluetooth';
    normalized.provider = 'ELM327 Bluetooth BLE (ISO 15765-4)';
  }

  // If OEM Telematics payload provided (e.g. Tata ZConnect or Tesla Fleet API)
  if (oemPayload) {
    normalized = parseOemTelematics(oemPayload, normalized);
  }

  // Calculate dynamic thermal & health status
  normalized.thermalStatus = getBatteryThermalStatus(normalized.batteryTempC);
  normalized.instantDrainRate = calculateDrainRate(normalized.instantPowerKw, normalized.speedKmh);

  return normalized;
};

/**
 * OEM-specific cloud format parser
 */
const parseOemTelematics = (oemPayload, base) => {
  const result = { ...base };
  const provider = (oemPayload.provider || '').toLowerCase();

  if (provider.includes('tesla')) {
    // Tesla Fleet Telematics Format
    result.provider = 'Tesla Fleet API (Cloud Telematics)';
    result.source = 'oem_telematics';
    result.socPct = oemPayload.charge_state?.battery_level ?? result.socPct;
    result.speedKmh = oemPayload.drive_state?.speed ? Math.round(oemPayload.drive_state.speed * 1.60934) : result.speedKmh;
    result.odometerKm = oemPayload.vehicle_state?.odometer ? Math.round(oemPayload.vehicle_state.odometer * 1.60934) : result.odometerKm;
    result.isCharging = oemPayload.charge_state?.charging_state === 'Charging';
    result.batteryTempC = oemPayload.charge_state?.battery_temp ?? 26;
    result.instantPowerKw = oemPayload.drive_state?.power ?? 14;
    result.hvacDrawKw = oemPayload.climate_state?.is_climate_on ? 1.8 : 0.2;
  } else if (provider.includes('tata') || provider.includes('zconnect')) {
    // Tata ZConnect Cloud API Format
    result.provider = 'Tata ZConnect EV Telematics';
    result.source = 'oem_telematics';
    result.socPct = oemPayload.evStatus?.batteryStateOfCharge ?? oemPayload.soc ?? result.socPct;
    result.batteryTempC = oemPayload.evStatus?.batteryPackTemp ?? 28;
    result.speedKmh = oemPayload.vehicleSpeed ?? result.speedKmh;
    result.instantPowerKw = oemPayload.evStatus?.instantaneousPowerKw ?? result.instantPowerKw;
    result.packVoltageV = oemPayload.evStatus?.packVoltage ?? 350;
    result.sohPct = oemPayload.evStatus?.batteryHealthSoh ?? 98;
    result.odometerKm = oemPayload.totalDistanceKm ?? result.odometerKm;
  } else if (provider.includes('hyundai') || provider.includes('bluelink')) {
    // Hyundai Bluelink / Genesis Connected Care
    result.provider = 'Hyundai Bluelink Connected Car API';
    result.source = 'oem_telematics';
    result.socPct = oemPayload.status?.evStatus?.batteryStatus ?? result.socPct;
    result.speedKmh = oemPayload.status?.speed?.value ?? result.speedKmh;
    result.odometerKm = oemPayload.status?.distance ?? result.odometerKm;
    result.instantPowerKw = oemPayload.status?.evStatus?.powerKw ?? 15;
  } else if (provider.includes('smartcar')) {
    // Smartcar Standardized API
    result.provider = 'Smartcar Standardized EV Telematics';
    result.source = 'smartcar';
    result.socPct = oemPayload.percentRemaining ? Math.round(oemPayload.percentRemaining * 100) : result.socPct;
    result.odometerKm = oemPayload.distance ? Math.round(oemPayload.distance) : result.odometerKm;
    result.isCharging = oemPayload.state === 'CHARGING';
  }

  return result;
};

const getBatteryThermalStatus = (tempC) => {
  if (tempC < 10) return { code: 'cold', label: 'Cold Pack - Pre-conditioning Recommended', severity: 'warning' };
  if (tempC >= 15 && tempC <= 32) return { code: 'optimal', label: 'Optimal Thermal Window (15-32°C)', severity: 'good' };
  if (tempC > 32 && tempC <= 42) return { code: 'warm', label: 'Warm Pack - Active Liquid Cooling Active', severity: 'warning' };
  return { code: 'hot', label: 'Thermal Warning - High Battery Temperature', severity: 'critical' };
};

const calculateDrainRate = (powerKw, speedKmh) => {
  if (!speedKmh || speedKmh < 5) return 'Idling / Parked';
  const kwhPer100km = (powerKw / speedKmh) * 100;
  return `${kwhPer100km.toFixed(1)} kWh/100km`;
};

/**
 * Generate simulated live vehicle telemetry stream based on vehicle specs and driving conditions
 */
const generateSimulatedTelemetry = (vehicle, options = {}) => {
  const {
    speedKmh = 62,
    gradientPct = 1.5,
    ambientTempC = 26,
    hvacActive = true,
    progressRatio = 0.35,
    customSoc = null,
  } = options;

  const baseCapacity = vehicle?.batteryCapacityKwh || 40.5;
  const baseEfficiency = vehicle?.efficiencyKwhPer100km || 15;

  // Calculate dynamic power: base rolling + aerodynamic (v^2) + gradient (m*g*slope) + HVAC
  const speed = Math.max(0, speedKmh);
  const aeroKw = (speed / 100) ** 2 * 12;
  const rollingKw = (speed / 100) * 8;
  const gradientKw = gradientPct > 0 ? (gradientPct / 100) * (speed / 100) * 80 : (gradientPct / 100) * 30; // regen downhill
  const hvacKw = hvacActive ? (ambientTempC > 28 ? 1.6 : ambientTempC < 15 ? 2.2 : 0.6) : 0.1;

  const instantPowerKw = parseFloat(Math.max(-25, rollingKw + aeroKw + gradientKw + hvacKw).toFixed(1));

  // Compute SoC
  let socPct;
  if (customSoc != null) {
    socPct = customSoc;
  } else {
    const drainPct = (progressRatio * 100 * (baseEfficiency / 100) * 100) / baseCapacity;
    socPct = parseFloat(Math.max(5, (vehicle?.usableBatteryPct || 90) - drainPct).toFixed(1));
  }

  // Pack Voltage calculation based on nominal voltage and SoC
  const nominalV = vehicle?.telematicsSupport?.packNominalVoltageV || 350;
  const packVoltageV = parseFloat((nominalV * 0.9 + (socPct / 100) * (nominalV * 0.22)).toFixed(1));

  // Battery Temp rises under load
  const batteryTempC = parseFloat((ambientTempC + (instantPowerKw > 25 ? 5.2 : 2.1)).toFixed(1));

  return normalizeTelemetry({
    source: 'obd2_bluetooth',
    vehicleId: vehicle?.id || 'tata-nexon-ev-max',
    vehicleModel: vehicle?.name || 'Tata Nexon EV Max',
    provider: vehicle?.telematicsSupport?.oemApiProvider || 'Tata ZConnect Cloud & ELM327 BLE',
    socPct,
    batteryTempC,
    packVoltageV,
    instantPowerKw,
    hvacDrawKw: hvacKw,
    speedKmh: speed,
    odometerKm: 14250 + Math.round(progressRatio * 120),
    sohPct: 98.4,
    gearState: speed > 0 ? 'D' : 'P',
    isCharging: false,
  });
};

module.exports = {
  OBD_PIDS,
  decodeObdFrame,
  normalizeTelemetry,
  parseOemTelematics,
  generateSimulatedTelemetry,
};
