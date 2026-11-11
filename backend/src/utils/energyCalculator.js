/**
 * EV Energy Calculation Utilities
 * Core deterministic route-energy simulation engine
 */

const calculateEnergyForSegment = (distanceKm, efficiencyKwhPer100km, speedFactor = 1.0) => {
  return (distanceKm / 100) * efficiencyKwhPer100km * speedFactor;
};

const calculateSafeRange = (batteryCapacityKwh, usableBatteryPct, currentSocPct, efficiencyKwhPer100km, safetyFactor = 0.85) => {
  const currentEnergy = batteryCapacityKwh * (currentSocPct / 100);
  const minReserveEnergy = batteryCapacityKwh * 0.10;
  const usableForTravel = (currentEnergy - minReserveEnergy) * safetyFactor;
  return (usableForTravel / efficiencyKwhPer100km) * 100;
};

const calculateChargingTime = (energyToAddKwh, chargingPowerKw) => {
  return (energyToAddKwh / chargingPowerKw) * 60;
};

const calculateChargingCost = (energyKwh, ratePerKwh) => {
  return energyKwh * ratePerKwh;
};

const applyWeatherFactor = (baseEfficiency, weatherData) => {
  if (!weatherData) return { efficiency: baseEfficiency, factor: 1.0, description: 'No weather data' };
  const temp = weatherData.temp;
  const windSpeed = weatherData.windSpeed || 0;
  const weatherMain = (weatherData.main || '').toLowerCase();

  let tempFactor = 1.0;
  if (temp < 0) tempFactor = 1.35;
  else if (temp < 5) tempFactor = 1.25;
  else if (temp < 10) tempFactor = 1.15;
  else if (temp < 15) tempFactor = 1.08;
  else if (temp >= 20 && temp <= 25) tempFactor = 1.0;
  else if (temp > 35) tempFactor = 1.12;
  else if (temp > 30) tempFactor = 1.07;

  let weatherConditionFactor = 1.0;
  if (weatherMain.includes('rain') || weatherMain.includes('drizzle')) weatherConditionFactor = 1.08;
  else if (weatherMain.includes('snow') || weatherMain.includes('sleet')) weatherConditionFactor = 1.20;
  else if (weatherMain.includes('storm')) weatherConditionFactor = 1.15;

  const windFactor = 1 + (windSpeed * 0.005);
  const totalFactor = tempFactor * weatherConditionFactor * windFactor;
  return {
    efficiency: baseEfficiency * totalFactor,
    factor: totalFactor,
    breakdown: { tempFactor, weatherConditionFactor, windFactor },
    description: `${weatherData.description || 'Clear'}, ${temp}°C, wind ${windSpeed} m/s`,
  };
};

const applyTrafficFactor = (baseEfficiency, trafficLevel) => {
  const factors = { free: 1.0, light: 1.05, moderate: 1.12, heavy: 1.22, congested: 1.35 };
  const factor = factors[trafficLevel] || 1.0;
  return { efficiency: baseEfficiency * factor, factor, trafficLevel };
};

const calculateBatteryDegradation = (tripData) => {
  const { totalDistanceKm, chargingStops, vehicle } = tripData;
  const fastChargeStops = chargingStops.filter(s => s.chargingPowerKw >= 50).length;
  const avgDod = chargingStops.length > 0
    ? chargingStops.reduce((acc, s) => acc + (100 - s.arrivalSocPct), 0) / chargingStops.length
    : 40;

  const baseDegradation = (totalDistanceKm / 300000) * 100;
  const fastChargePenalty = fastChargeStops * 0.002;
  const deepDischargePenalty = avgDod > 80 ? (avgDod - 80) * 0.001 : 0;
  const totalDegradation = baseDegradation + fastChargePenalty + deepDischargePenalty;

  return {
    estimatedSohImpactPct: parseFloat(totalDegradation.toFixed(4)),
    fastChargeStops,
    avgDepthOfDischarge: parseFloat(avgDod.toFixed(1)),
    recommendation: fastChargeStops > 3 ? 'Consider using slower AC chargers when time permits to preserve battery health.' : 'Battery usage is within healthy parameters for this trip.',
  };
};

const runRouteSimulation = (vehicle, segments, availableStations) => {
  const {
    batteryCapacityKwh, usableBatteryPct, efficiencyKwhPer100km,
    minReserveSocPct, targetChargeSocPct, chargingPowerKw, electricityRatePerKwh,
  } = vehicle;

  const usableEnergy = batteryCapacityKwh * (usableBatteryPct / 100);
  const minReserveEnergy = batteryCapacityKwh * (minReserveSocPct / 100);
  const targetChargeEnergy = batteryCapacityKwh * (targetChargeSocPct / 100);

  let currentEnergy = usableEnergy;
  const chargingStops = [];
  const segmentResults = [];
  let totalChargingTimeMin = 0;
  let totalChargingCostUsd = 0;
  let totalEnergyKwh = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const energyNeeded = calculateEnergyForSegment(segment.distanceKm, efficiencyKwhPer100km);

    if (currentEnergy - energyNeeded < minReserveEnergy) {
      const station = findNearestStation(segment.startPoint || segment.from, availableStations);
      const energyToAdd = targetChargeEnergy - currentEnergy;
      if (energyToAdd > 0) {
        const stationPower = station ? Math.min(station.maxPowerKw || chargingPowerKw, 150) : chargingPowerKw;
        const chargeTime = calculateChargingTime(energyToAdd, stationPower);
        const cost = calculateChargingCost(energyToAdd, electricityRatePerKwh);
        chargingStops.push({
          stationId: station ? station.id : `mock_${i}`,
          stationName: station ? station.name : `Charging Stop ${chargingStops.length + 1}`,
          location: station ? station.location : segment.startPoint,
          address: station ? station.address : 'Along Route',
          chargingPowerKw: stationPower,
          arrivalSocPct: parseFloat(((currentEnergy / batteryCapacityKwh) * 100).toFixed(1)),
          departureSocPct: targetChargeSocPct,
          energyAddedKwh: parseFloat(energyToAdd.toFixed(2)),
          chargingTimeMin: parseFloat(chargeTime.toFixed(0)),
          costUsd: parseFloat(cost.toFixed(2)),
        });
        currentEnergy = targetChargeEnergy;
        totalChargingTimeMin += chargeTime;
        totalChargingCostUsd += cost;
      }
    }

    currentEnergy -= energyNeeded;
    totalEnergyKwh += energyNeeded;

    segmentResults.push({
      from: segment.from || `Point ${i}`,
      to: segment.to || `Point ${i + 1}`,
      distanceKm: parseFloat(segment.distanceKm.toFixed(2)),
      durationMin: parseFloat((segment.distanceKm / 1.0).toFixed(0)),
      energyKwh: parseFloat(energyNeeded.toFixed(2)),
      socAfterPct: parseFloat(((currentEnergy / batteryCapacityKwh) * 100).toFixed(1)),
    });
  }

  return {
    chargingStops,
    segmentResults,
    totalChargingTimeMin: parseFloat(totalChargingTimeMin.toFixed(0)),
    totalChargingCostUsd: parseFloat(totalChargingCostUsd.toFixed(2)),
    totalEnergyKwh: parseFloat(totalEnergyKwh.toFixed(2)),
    finalSocPct: parseFloat(((currentEnergy / batteryCapacityKwh) * 100).toFixed(1)),
  };
};

const findNearestStation = (point, stations) => {
  if (!stations || stations.length === 0) return null;
  if (!point) return stations[0];
  let nearest = stations[0];
  let minDist = Infinity;
  for (const s of stations) {
    if (!s.location) continue;
    const d = Math.sqrt(
      Math.pow(s.location.lat - point.lat, 2) + Math.pow(s.location.lng - point.lng, 2)
    );
    if (d < minDist) { minDist = d; nearest = s; }
  }
  return nearest;
};

module.exports = {
  calculateEnergyForSegment,
  calculateSafeRange,
  calculateChargingTime,
  calculateChargingCost,
  applyWeatherFactor,
  applyTrafficFactor,
  calculateBatteryDegradation,
  runRouteSimulation,
  findNearestStation,
};
