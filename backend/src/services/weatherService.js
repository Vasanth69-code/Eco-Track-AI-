const axios = require('axios');
const { OPENWEATHER_API_KEY } = require('../config/envConfig');

const getWeatherAtLocation = async (lat, lng) => {
  if (OPENWEATHER_API_KEY && OPENWEATHER_API_KEY !== 'placeholder_key') {
    try {
      const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: { lat, lon: lng, appid: OPENWEATHER_API_KEY, units: 'metric' },
        timeout: 5000,
      });

      const d = response.data;
      return {
        temp: d.main.temp,
        feelsLike: d.main.feels_like,
        humidity: d.main.humidity,
        windSpeed: d.wind?.speed || 0,
        windDeg: d.wind?.deg || 0,
        main: d.weather[0]?.main || 'Clear',
        description: d.weather[0]?.description || 'clear sky',
        icon: d.weather[0]?.icon,
        cityName: d.name,
        visibility: d.visibility,
        pressure: d.main.pressure,
      };
    } catch (err) {
      console.warn('[OpenWeather] Error, using weather estimation:', err.message);
    }
  }

  // Realistic fallback weather estimation for EV energy consumption calculation
  const absLat = Math.abs(lat || 20);
  const estTemp = parseFloat(Math.max(12, Math.min(34, 30 - (absLat * 0.25))).toFixed(1));
  return {
    temp: estTemp,
    feelsLike: estTemp + 1.0,
    humidity: 55,
    windSpeed: 3.2,
    windDeg: 140,
    main: 'Clear',
    description: 'clear sky',
    icon: '01d',
    cityName: 'En Route',
    visibility: 10000,
    pressure: 1013,
  };
};

const simulateWeatherImpact = (baseEfficiency, batteryCapacityKwh, weatherData) => {
  if (!weatherData) return { adjustedEfficiency: baseEfficiency, factor: 1.0, analysis: [] };

  const { temp, windSpeed, main } = weatherData;
  const analysis = [];

  let tempFactor = 1.0;
  if (temp < 0) { tempFactor = 1.35; analysis.push({ factor: 'Extreme cold (<0°C)', impact: '+35%', detail: 'Battery chemistry severely limited, cabin heating load high' }); }
  else if (temp < 5) { tempFactor = 1.25; analysis.push({ factor: 'Very cold (0-5°C)', impact: '+25%', detail: 'Significant heating load and reduced battery performance' }); }
  else if (temp < 10) { tempFactor = 1.15; analysis.push({ factor: 'Cold (5-10°C)', impact: '+15%', detail: 'Moderate heating required, some battery limitation' }); }
  else if (temp < 15) { tempFactor = 1.08; analysis.push({ factor: 'Cool (10-15°C)', impact: '+8%', detail: 'Light heating, minor impact on efficiency' }); }
  else if (temp >= 20 && temp <= 25) { analysis.push({ factor: 'Optimal temperature (20-25°C)', impact: '0%', detail: 'Ideal conditions for battery performance' }); }
  else if (temp > 35) { tempFactor = 1.12; analysis.push({ factor: 'Very hot (>35°C)', impact: '+12%', detail: 'Cooling system load, battery thermal management active' }); }
  else if (temp > 30) { tempFactor = 1.07; analysis.push({ factor: 'Hot (30-35°C)', impact: '+7%', detail: 'Air conditioning increases consumption' }); }

  let condFactor = 1.0;
  const m = (main || '').toLowerCase();
  if (m.includes('rain')) { condFactor = 1.08; analysis.push({ factor: 'Rain', impact: '+8%', detail: 'Rolling resistance increased, wipers and defrost active' }); }
  else if (m.includes('snow')) { condFactor = 1.20; analysis.push({ factor: 'Snow', impact: '+20%', detail: 'High rolling resistance, heating, reduced traction efficiency' }); }
  else if (m.includes('storm')) { condFactor = 1.15; analysis.push({ factor: 'Storm', impact: '+15%', detail: 'High wind resistance and visibility systems load' }); }

  let windFactor = 1.0;
  if (windSpeed > 10) { windFactor = 1 + (windSpeed - 10) * 0.008; analysis.push({ factor: `Strong wind (${windSpeed.toFixed(1)} m/s)`, impact: `+${((windFactor - 1) * 100).toFixed(1)}%`, detail: 'Headwind increases aerodynamic drag' }); }

  const totalFactor = tempFactor * condFactor * windFactor;

  return {
    adjustedEfficiency: parseFloat((baseEfficiency * totalFactor).toFixed(2)),
    factor: parseFloat(totalFactor.toFixed(3)),
    tempFactor: parseFloat(tempFactor.toFixed(3)),
    conditionFactor: parseFloat(condFactor.toFixed(3)),
    windFactor: parseFloat(windFactor.toFixed(3)),
    analysis,
    weatherSummary: `${weatherData.description}, ${temp}°C, wind ${windSpeed} m/s`,
  };
};

module.exports = { getWeatherAtLocation, simulateWeatherImpact };
