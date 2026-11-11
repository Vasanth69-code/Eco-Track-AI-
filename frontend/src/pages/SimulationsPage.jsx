import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud, Navigation, Battery, Zap, Thermometer, Wind, Activity,
  AlertTriangle, RefreshCw, LocateFixed, CheckCircle2, ShieldCheck, Gauge
} from 'lucide-react';
import { runWeatherSimulation, runTrafficSimulation, runBatteryDegradation } from '../services/authService';
import { DEFAULT_VEHICLE } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'weather', label: 'Weather & Temperature', icon: Cloud },
  { id: 'traffic', label: 'Traffic Impact', icon: Navigation },
  { id: 'battery', label: 'Battery Health & Thermal', icon: Battery },
];

const PRESETS = [
  { name: '📍 Live GPS', lat: null, lng: null, isLive: true },
  { name: 'Bengaluru', lat: '12.9716', lng: '77.5946' },
  { name: 'Delhi NCR', lat: '28.6139', lng: '77.2090' },
  { name: 'Mumbai', lat: '19.0760', lng: '72.8777' },
  { name: 'Chennai', lat: '13.0827', lng: '80.2707' },
  { name: 'London', lat: '51.5074', lng: '-0.1278' },
  { name: 'New York', lat: '40.7128', lng: '-74.0060' },
];

const SimulationsPage = () => {
  const { user } = useAuth();
  const vehicle = user?.defaultVehicle || DEFAULT_VEHICLE;

  const [activeTab, setActiveTab] = useState('weather');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState('📍 Live GPS');
  const [locationName, setLocationName] = useState('Detecting location...');

  const [weatherForm, setWeatherForm] = useState({
    lat: '12.9716',
    lng: '77.5946',
    baseEfficiency: vehicle.efficiencyKwhPer100km,
    totalDistanceKm: 250,
  });

  const [trafficForm, setTrafficForm] = useState({
    lat: '12.9716',
    lng: '77.5946',
    baseEfficiency: vehicle.efficiencyKwhPer100km,
    totalDistanceKm: 250,
  });

  const [batteryForm, setBatteryForm] = useState({
    totalDistanceKm: 350,
    numberOfChargingStops: 2,
    fastChargeStops: 2,
    avgDepthOfDischarge: 65,
  });

  // Weather simulation function
  const executeWeatherSim = useCallback(async (lat, lng, efficiency, distance) => {
    setLoading(true);
    try {
      const res = await runWeatherSimulation({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        baseEfficiency: parseFloat(efficiency),
        batteryCapacityKwh: vehicle.batteryCapacityKwh,
        totalDistanceKm: parseFloat(distance),
      });
      setResults(p => ({ ...p, weather: res.data.data }));
      setLastUpdated(new Date().toLocaleTimeString());
      if (res.data.data?.weatherData?.cityName) {
        setLocationName(res.data.data.weatherData.cityName);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Weather simulation failed');
    } finally {
      setLoading(false);
    }
  }, [vehicle.batteryCapacityKwh]);

  // Traffic simulation function
  const executeTrafficSim = useCallback(async (lat, lng, efficiency, distance) => {
    setLoading(true);
    try {
      const res = await runTrafficSimulation({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        baseEfficiency: parseFloat(efficiency),
        totalDistanceKm: parseFloat(distance),
      });
      setResults(p => ({ ...p, traffic: res.data.data }));
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Traffic simulation failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Battery health simulation function
  const executeBatterySim = useCallback(async (form) => {
    setLoading(true);
    try {
      const res = await runBatteryDegradation({
        tripData: {
          totalDistanceKm: parseFloat(form.totalDistanceKm),
          chargingStops: Array.from({ length: form.numberOfChargingStops }, (_, i) => ({
            chargingPowerKw: i < form.fastChargeStops ? 100 : 22,
            arrivalSocPct: 100 - form.avgDepthOfDischarge,
          })),
          vehicle,
        },
      });
      setResults(p => ({ ...p, battery: res.data.data }));
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      toast.error('Battery analysis failed');
    } finally {
      setLoading(false);
    }
  }, [vehicle]);

  // Auto-render on mount with live GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lng = pos.coords.longitude.toFixed(4);
          setWeatherForm(p => ({ ...p, lat, lng }));
          setTrafficForm(p => ({ ...p, lat, lng }));
          executeWeatherSim(lat, lng, weatherForm.baseEfficiency, weatherForm.totalDistanceKm);
        },
        () => {
          // Fallback if permission denied
          setSelectedPreset('Bengaluru');
          executeWeatherSim('12.9716', '77.5946', weatherForm.baseEfficiency, weatherForm.totalDistanceKm);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      executeWeatherSim(weatherForm.lat, weatherForm.lng, weatherForm.baseEfficiency, weatherForm.totalDistanceKm);
    }
  }, []);

  // Auto-render when switching tabs if results are missing
  useEffect(() => {
    if (activeTab === 'traffic' && !results.traffic) {
      executeTrafficSim(trafficForm.lat, trafficForm.lng, trafficForm.baseEfficiency, trafficForm.totalDistanceKm);
    } else if (activeTab === 'battery' && !results.battery) {
      executeBatterySim(batteryForm);
    }
  }, [activeTab, results, trafficForm, batteryForm, executeTrafficSim, executeBatterySim]);

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset.name);
    if (preset.isLive && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lng = pos.coords.longitude.toFixed(4);
          setWeatherForm(p => ({ ...p, lat, lng }));
          setTrafficForm(p => ({ ...p, lat, lng }));
          executeWeatherSim(lat, lng, weatherForm.baseEfficiency, weatherForm.totalDistanceKm);
          toast.success('Live GPS coordinates loaded!');
        },
        () => toast.error('Location access denied')
      );
    } else if (preset.lat && preset.lng) {
      setWeatherForm(p => ({ ...p, lat: preset.lat, lng: preset.lng }));
      setTrafficForm(p => ({ ...p, lat: preset.lat, lng: preset.lng }));
      executeWeatherSim(preset.lat, preset.lng, weatherForm.baseEfficiency, weatherForm.totalDistanceKm);
      toast.success(`Weather loaded for ${preset.name}`);
    }
  };

  const InputRow = ({ label, value, onChange, type = 'number', unit, min, max, step }) => (
    <div>
      <label className="block text-xs dark:text-dark-muted text-light-muted mb-1 font-medium">{label}</label>
      <div className="relative">
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)} min={min} max={max} step={step}
          className="w-full px-3 py-2.5 rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-highlight bg-light-highlight dark:text-dark-text text-light-text text-sm focus:outline-none focus:border-primary transition-all pr-12"
        />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs dark:text-dark-muted text-light-muted">{unit}</span>}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header with live refresh */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold dark:text-dark-text text-light-text">Real-Time Energy & Weather Simulations</h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Data Auto-Render
            </span>
          </div>
          <p className="text-sm dark:text-dark-muted text-light-muted mt-0.5">
            Auto-analyzes ambient temperature, aerodynamic wind drag, traffic friction, and battery health
          </p>
        </div>

        <button
          onClick={() => {
            if (activeTab === 'weather') executeWeatherSim(weatherForm.lat, weatherForm.lng, weatherForm.baseEfficiency, weatherForm.totalDistanceKm);
            if (activeTab === 'traffic') executeTrafficSim(trafficForm.lat, trafficForm.lng, trafficForm.baseEfficiency, trafficForm.totalDistanceKm);
            if (activeTab === 'battery') executeBatterySim(batteryForm);
          }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border dark:border-dark-border border-light-border dark:hover:bg-dark-highlight hover:bg-light-highlight text-xs font-semibold dark:text-dark-text text-light-text transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          {lastUpdated ? `Updated ${lastUpdated}` : 'Refresh Realtime Data'}
        </button>
      </motion.div>

      {/* Preset Location Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">Location:</span>
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => handleSelectPreset(p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedPreset === p.name
                ? 'bg-primary text-dark-bg font-bold shadow-md shadow-primary/20'
                : 'dark:bg-dark-surface bg-white border dark:border-dark-border border-light-border dark:text-dark-muted text-light-muted hover:border-primary/40'
            }`}
          >
            {p.isLive ? <LocateFixed className="w-3 h-3" /> : null}
            {p.name}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-primary text-dark-bg font-bold shadow-lg shadow-primary/20'
                : 'dark:bg-dark-surface bg-white border dark:border-dark-border border-light-border dark:text-dark-muted text-light-muted dark:hover:text-dark-text hover:text-light-text'
            }`}
            data-testid={`tab-${t.id}`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border p-6 space-y-4"
        >
          {/* Weather Settings */}
          {activeTab === 'weather' && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-bold dark:text-dark-text text-light-text flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-primary" /> Real-time Weather Parameters
                </h3>
                <span className="text-xs text-primary font-medium">{locationName}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InputRow label="Latitude" value={weatherForm.lat} onChange={v => setWeatherForm(p => ({ ...p, lat: v }))} type="text" />
                <InputRow label="Longitude" value={weatherForm.lng} onChange={v => setWeatherForm(p => ({ ...p, lng: v }))} type="text" />
                <InputRow label="Base Efficiency" value={weatherForm.baseEfficiency} onChange={v => setWeatherForm(p => ({ ...p, baseEfficiency: v }))} unit="kWh/100km" min={5} max={50} step={0.5} />
                <InputRow label="Trip Distance" value={weatherForm.totalDistanceKm} onChange={v => setWeatherForm(p => ({ ...p, totalDistanceKm: v }))} unit="km" min={10} max={2000} />
              </div>

              <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs dark:text-dark-muted text-light-muted flex items-start gap-2">
                <Thermometer className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <p>
                  Automatically incorporates ambient temperature, cabin climate control (heating/cooling load), wind resistance, and precipitation into EV range calculation.
                </p>
              </div>

              <button
                onClick={() => executeWeatherSim(weatherForm.lat, weatherForm.lng, weatherForm.baseEfficiency, weatherForm.totalDistanceKm)}
                disabled={loading}
                className="w-full py-3 volt-btn rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                data-testid="run-weather-sim-btn"
              >
                {loading ? <LoadingSpinner size="sm" /> : <><Cloud className="w-4 h-4" /> Re-calculate Weather Impact</>}
              </button>
            </>
          )}

          {/* Traffic Settings */}
          {activeTab === 'traffic' && (
            <>
              <h3 className="font-bold dark:text-dark-text text-light-text flex items-center gap-2">
                <Navigation className="w-4 h-4 text-secondary" /> Traffic Congestion Parameters
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <InputRow label="Latitude" value={trafficForm.lat} onChange={v => setTrafficForm(p => ({ ...p, lat: v }))} type="text" />
                <InputRow label="Longitude" value={trafficForm.lng} onChange={v => setTrafficForm(p => ({ ...p, lng: v }))} type="text" />
                <InputRow label="Base Efficiency" value={trafficForm.baseEfficiency} onChange={v => setTrafficForm(p => ({ ...p, baseEfficiency: v }))} unit="kWh/100km" min={5} max={50} step={0.5} />
                <InputRow label="Trip Distance" value={trafficForm.totalDistanceKm} onChange={v => setTrafficForm(p => ({ ...p, totalDistanceKm: v }))} unit="km" min={10} max={2000} />
              </div>
              <p className="text-xs dark:text-dark-muted text-light-muted">
                Calculates stop-and-go energy loss, acceleration penalties, and idle auxiliary consumption under current traffic conditions.
              </p>
              <button
                onClick={() => executeTrafficSim(trafficForm.lat, trafficForm.lng, trafficForm.baseEfficiency, trafficForm.totalDistanceKm)}
                disabled={loading}
                className="w-full py-3 volt-btn rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                data-testid="run-traffic-sim-btn"
              >
                {loading ? <LoadingSpinner size="sm" /> : <><Navigation className="w-4 h-4" /> Re-calculate Traffic Impact</>}
              </button>
            </>
          )}

          {/* Battery Settings */}
          {activeTab === 'battery' && (
            <>
              <h3 className="font-bold dark:text-dark-text text-light-text flex items-center gap-2">
                <Battery className="w-4 h-4 text-emerald-400" /> Battery Health & Degradation Estimator
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <InputRow label="Trip Distance" value={batteryForm.totalDistanceKm} onChange={v => setBatteryForm(p => ({ ...p, totalDistanceKm: parseFloat(v) || 0 }))} unit="km" />
                <InputRow label="Total Charge Stops" value={batteryForm.numberOfChargingStops} onChange={v => setBatteryForm(p => ({ ...p, numberOfChargingStops: parseInt(v) || 0 }))} min={0} max={20} />
                <InputRow label="DC Fast Charge Stops" value={batteryForm.fastChargeStops} onChange={v => setBatteryForm(p => ({ ...p, fastChargeStops: parseInt(v) || 0 }))} min={0} max={20} />
                <InputRow label="Avg Depth of Discharge" value={batteryForm.avgDepthOfDischarge} onChange={v => setBatteryForm(p => ({ ...p, avgDepthOfDischarge: parseFloat(v) || 0 }))} unit="%" min={0} max={100} />
              </div>
              <p className="text-xs dark:text-dark-muted text-light-muted">
                Estimates long-term battery State of Health (SoH) preservation based on charging C-rates, thermal strain, and cycle depth.
              </p>
              <button
                onClick={() => executeBatterySim(batteryForm)}
                disabled={loading}
                className="w-full py-3 volt-btn rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                data-testid="run-battery-sim-btn"
              >
                {loading ? <LoadingSpinner size="sm" /> : <><Battery className="w-4 h-4" /> Analyze Battery Health</>}
              </button>
            </>
          )}
        </motion.div>

        {/* Results Panel */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold dark:text-dark-text text-light-text flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Live Simulation Results
            </h3>
            {loading && <LoadingSpinner size="sm" />}
          </div>

          {/* Weather Results */}
          {activeTab === 'weather' && results.weather && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {results.weather.weatherData && (
                <div className="p-4 rounded-xl dark:bg-dark-highlight bg-light-highlight border dark:border-dark-border border-light-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-5 h-5 text-orange-400" />
                      <span className="font-bold dark:text-dark-text text-light-text text-base">{results.weather.weatherData.cityName || locationName}</span>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-primary/10 text-primary">Live Conditions</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="p-2.5 rounded-lg dark:bg-dark-surface bg-white">
                      <span className="dark:text-dark-muted text-light-muted text-xs block">Temperature</span>
                      <p className="font-bold text-orange-400 text-lg">{results.weather.weatherData.temp?.toFixed(1)}°C</p>
                      <span className="text-[10px] text-slate-400">Feels {results.weather.weatherData.feelsLike?.toFixed(0)}°C</span>
                    </div>

                    <div className="p-2.5 rounded-lg dark:bg-dark-surface bg-white">
                      <span className="dark:text-dark-muted text-light-muted text-xs block">Condition</span>
                      <p className="font-bold dark:text-dark-text text-light-text capitalize truncate">{results.weather.weatherData.description}</p>
                      <span className="text-[10px] text-emerald-400">Atmosphere</span>
                    </div>

                    <div className="p-2.5 rounded-lg dark:bg-dark-surface bg-white">
                      <span className="dark:text-dark-muted text-light-muted text-xs block">Wind Speed</span>
                      <p className="font-bold dark:text-dark-text text-light-text text-lg">{((results.weather.weatherData.windSpeed || 0) * 3.6).toFixed(1)} km/h</p>
                      <span className="text-[10px] text-slate-400">Aerodynamics</span>
                    </div>

                    <div className="p-2.5 rounded-lg dark:bg-dark-surface bg-white">
                      <span className="dark:text-dark-muted text-light-muted text-xs block">Humidity</span>
                      <p className="font-bold dark:text-dark-text text-light-text text-lg">{results.weather.weatherData.humidity}%</p>
                      <span className="text-[10px] text-slate-400">Moisture</span>
                    </div>
                  </div>
                </div>
              )}

              {results.weather.impact && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
                      <span className="text-xs text-slate-400 block">Adjusted Consumption</span>
                      <p className="text-xl font-bold text-primary stat-number mt-1">
                        {results.weather.impact.adjustedEfficiency?.toFixed(1)} <span className="text-xs font-normal">kWh/100km</span>
                      </p>
                      <span className="text-[10px] text-slate-400">Base: {weatherForm.baseEfficiency} kWh/100km</span>
                    </div>

                    <div className="p-3 rounded-xl border border-orange-500/20 bg-orange-500/5">
                      <span className="text-xs text-slate-400 block">Weather Drag Factor</span>
                      <p className="text-xl font-bold text-orange-400 stat-number mt-1">
                        ×{results.weather.impact.factor?.toFixed(3)}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {results.weather.impact.factor > 1 ? `+${((results.weather.impact.factor - 1) * 100).toFixed(1)}% battery draw` : 'Optimal range'}
                      </span>
                    </div>
                  </div>

                  {results.weather.extraEnergyKwh !== null && (
                    <div className="flex items-center justify-between p-3 rounded-xl dark:bg-dark-highlight bg-light-highlight">
                      <span className="text-xs dark:text-dark-muted text-light-muted">Extra Battery Consumed for {weatherForm.totalDistanceKm} km:</span>
                      <span className="font-bold text-orange-400 stat-number text-sm">+{results.weather.extraEnergyKwh?.toFixed(1)} kWh</span>
                    </div>
                  )}

                  <div className="space-y-2 mt-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Multi-Factor Analysis Breakdown</p>
                    {results.weather.impact.analysis?.map((a, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-2.5 dark:bg-dark-highlight bg-light-highlight rounded-xl border dark:border-dark-border/40 border-light-border/40">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold dark:text-dark-text text-light-text">
                            {a.factor} <span className="text-orange-400 font-bold">({a.impact})</span>
                          </p>
                          <p className="text-xs dark:text-dark-muted text-light-muted mt-0.5">{a.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Traffic Results */}
          {activeTab === 'traffic' && results.traffic && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="p-4 rounded-xl dark:bg-dark-highlight bg-light-highlight border dark:border-dark-border border-light-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold dark:text-dark-text text-light-text">Traffic Flow Condition</span>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-secondary/10 text-secondary capitalize">
                    {results.traffic.levelLabel || results.traffic.trafficLevel}
                  </span>
                </div>
                <p className="text-xs dark:text-dark-muted text-light-muted">{results.traffic.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block">Traffic Penalty</span>
                    <p className="font-bold text-orange-400 text-lg">+{results.traffic.impactPct}%</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Traffic-Adjusted Efficiency</span>
                    <p className="font-bold text-primary text-lg">{results.traffic.adjustedEfficiency} kWh/100km</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Battery Health Results */}
          {activeTab === 'battery' && results.battery && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="p-4 rounded-xl dark:bg-dark-highlight bg-light-highlight border dark:border-dark-border border-light-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold dark:text-dark-text text-light-text">Battery State of Health (SoH)</span>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-400">98.5% Healthy</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block">Trip Degradation Impact</span>
                    <p className="font-bold text-emerald-400 text-lg">-{results.battery.estimatedSohImpactPct?.toFixed(4)}%</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Avg Depth of Discharge</span>
                    <p className="font-bold text-primary text-lg">{results.battery.avgDepthOfDischarge}%</p>
                  </div>
                </div>
                <p className="text-xs text-emerald-400/90 flex items-center gap-1.5 mt-2">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  {results.battery.recommendation}
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SimulationsPage;
