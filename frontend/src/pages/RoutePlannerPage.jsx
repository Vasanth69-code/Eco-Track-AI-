import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Route, Zap, Battery, MapPin, Settings, Search, ChevronDown, ChevronUp, Info, Car, Plus, X, LocateFixed, Navigation, Loader2, CheckCircle2 } from 'lucide-react';
import { calculateRoute } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_VEHICLE } from '../config/constants';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PlaceAutocompleteInput from '../components/common/PlaceAutocompleteInput';
import toast from 'react-hot-toast';

const InputField = ({ label, name, value, onChange, type = 'text', placeholder, min, max, step, unit, tooltip }) => (
  <div>
    <div className="flex items-center gap-1.5 mb-1.5">
      <label className="text-xs font-medium dark:text-dark-muted text-light-muted uppercase tracking-wide">{label}</label>
      {tooltip && <Info className="w-3 h-3 dark:text-dark-muted text-light-muted" title={tooltip} />}
    </div>
    <div className="relative">
      <input
        type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} min={min} max={max} step={step}
        className="w-full px-4 py-2.5 rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-highlight bg-light-highlight dark:text-dark-text text-light-text text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all pr-12"
        data-testid={`input-${name}`}
      />
      {unit && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs dark:text-dark-muted text-light-muted font-mono">{unit}</span>
      )}
    </div>
  </div>
);

const RoutePlannerPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Accept vehicle pre-filled from VehicleLibrary
  const prefilledVehicle = location.state?.vehicle;
  const vehicle = prefilledVehicle || user?.defaultVehicle || DEFAULT_VEHICLE;

  const [form, setForm] = useState({
    origin: '',
    destination: '',
    originCoords: null,
    destinationCoords: null,
    batteryCapacityKwh: vehicle.batteryCapacityKwh,
    usableBatteryPct: vehicle.usableBatteryPct,
    efficiencyKwhPer100km: vehicle.efficiencyKwhPer100km,
    minReserveSocPct: vehicle.minReserveSocPct,
    targetChargeSocPct: vehicle.targetChargeSocPct,
    chargingPowerKw: vehicle.chargingPowerKw,
    electricityRatePerKwh: vehicle.electricityRatePerKwh,
  });

  const [waypoints, setWaypoints] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);

  // Reverse geocode GPS coordinates to a readable human address
  const reverseGeocode = async (lat, lng) => {
    // Tier 1: BigDataCloud free client reverse geocoder (CORS enabled, highly reliable)
    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      if (bdcRes.ok) {
        const d = await bdcRes.json();
        const parts = [
          d.locality || d.city || d.principalSubdivisionDistrict,
          d.principalSubdivision,
          d.countryName,
        ].filter(Boolean);
        if (parts.length > 0) return parts.join(', ');
      }
    } catch {
      // ignore and try tier 2
    }

    // Tier 2: OpenStreetMap Nominatim
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const a = data.address;
          const local = a.suburb || a.neighbourhood || a.road || a.residential || a.subdistrict;
          const city = a.city || a.town || a.village || a.county || a.state_district;
          const state = a.state;
          const parts = [local, city, state].filter(Boolean);
          if (parts.length >= 2) return parts.join(', ');
          if (data.display_name) return data.display_name.split(',').slice(0, 3).join(', ').trim();
        }
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err.message);
    }

    return `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  };

  // Helper promise for browser geolocation
  const queryBrowserLocation = (enableHighAccuracy, timeoutMs) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation not supported'));
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy,
        timeout: timeoutMs,
        maximumAge: 30000,
      });
    });
  };

  // Detect live location via multi-tier detection (GPS -> WiFi/Network -> IP Geolocation)
  const detectLiveLocation = async (notify = true) => {
    setIsDetectingLocation(true);

    const applyCoordinates = async (lat, lng, sourceName = 'GPS') => {
      setForm((p) => ({
        ...p,
        originCoords: { lat, lng },
      }));
      setLocationDetected(true);

      try {
        const readable = await reverseGeocode(lat, lng);
        setForm((p) => ({
          ...p,
          origin: readable,
          originCoords: { lat, lng },
        }));
        if (notify) {
          toast.success(`📍 Live location detected: ${readable}`, { duration: 4000 });
        }
      } catch {
        const fallbackText = `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        setForm((p) => ({
          ...p,
          origin: fallbackText,
          originCoords: { lat, lng },
        }));
        if (notify) toast.success(`📍 Live location detected (${sourceName})`);
      } finally {
        setIsDetectingLocation(false);
      }
    };

    try {
      // Tier 1: Try Browser High-Accuracy GPS (3.5s timeout)
      try {
        const pos = await queryBrowserLocation(true, 3500);
        await applyCoordinates(pos.coords.latitude, pos.coords.longitude, 'GPS');
        return;
      } catch {
        // High accuracy timed out or unavailable on desktop, fall to low accuracy
      }

      // Tier 2: Try Browser Network/WiFi Geolocation (3.5s timeout)
      try {
        const pos = await queryBrowserLocation(false, 3500);
        await applyCoordinates(pos.coords.latitude, pos.coords.longitude, 'Network');
        return;
      } catch {
        // Network geolocation unavailable or permission denied
      }

      // Tier 3: IP-based Geolocation fallback (works instantaneously on any PC/browser)
      try {
        const ipRes = await fetch('https://freeipapi.com/api/json');
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData.latitude && ipData.longitude) {
            const locName = [ipData.cityName, ipData.regionName, ipData.countryName].filter(Boolean).join(', ');
            await applyCoordinates(ipData.latitude, ipData.longitude, 'Network IP');
            return;
          }
        }
      } catch {
        // IP fallback note
      }

      // Fallback: If all auto-detection fails, provide default Bengaluru metro coords
      setIsDetectingLocation(false);
      if (notify) {
        toast.error('Unable to auto-detect live location. Please select your starting city from suggestions.');
      }
    } catch (err) {
      setIsDetectingLocation(false);
      if (notify) {
        toast.error('Location detection error. Please enter your location.');
      }
    }
  };

  // Auto-detect live location on mount if origin is empty
  useEffect(() => {
    if (!form.origin && navigator.geolocation) {
      detectLiveLocation(false);
    }
  }, []);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }));

  const addWaypoint = () => { if (waypoints.length < 3) setWaypoints(p => [...p, '']); };
  const removeWaypoint = (i) => setWaypoints(p => p.filter((_, idx) => idx !== i));
  const updateWaypoint = (i, val) => setWaypoints(p => { const n = [...p]; n[i] = val; return n; });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.origin.trim() || !form.destination.trim()) {
      toast.error('Please enter both origin and destination');
      return;
    }
    setLoading(true);
    try {
      const vehicleParams = {
        id: vehicle.id,
        name: vehicle.name || 'My EV',
        batteryCapacityKwh: form.batteryCapacityKwh,
        usableBatteryPct: form.usableBatteryPct,
        efficiencyKwhPer100km: form.efficiencyKwhPer100km,
        minReserveSocPct: form.minReserveSocPct,
        targetChargeSocPct: form.targetChargeSocPct,
        chargingPowerKw: form.chargingPowerKw,
        electricityRatePerKwh: form.electricityRatePerKwh,
        telematicsSupport: vehicle.telematicsSupport,
      };
      const filledWaypoints = waypoints.filter(w => w.trim());
      const payload = {
        origin: form.origin,
        destination: form.destination,
        originCoords: form.originCoords,
        destinationCoords: form.destinationCoords,
        waypoints: filledWaypoints,
        vehicle: vehicleParams,
      };
      const res = await calculateRoute(payload);
      navigate('/trip-results', { state: { tripData: res.data.data, vehicle: vehicleParams } });
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to calculate route. Please check your inputs.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const quickRoutes = [
    { from: 'Delhi, India', to: 'Agra, India', fromCoords: { lat: 28.6139, lng: 77.2090 }, toCoords: { lat: 27.1767, lng: 78.0081 } },
    { from: 'Mumbai, India', to: 'Pune, India', fromCoords: { lat: 19.0760, lng: 72.8777 }, toCoords: { lat: 18.5204, lng: 73.8567 } },
    { from: 'Bengaluru, India', to: 'Chennai, India', fromCoords: { lat: 12.9716, lng: 77.5946 }, toCoords: { lat: 13.0827, lng: 80.2707 } },
    { from: 'Hyderabad, India', to: 'Vijayawada, India', fromCoords: { lat: 17.3850, lng: 78.4867 }, toCoords: { lat: 16.5062, lng: 80.6480 } },
  ];

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold dark:text-dark-text text-light-text">Plan Your EV Route</h2>
        <p className="text-sm dark:text-dark-muted text-light-muted mt-0.5">Enter your trip details and get an optimized charging plan</p>
      </motion.div>

      {/* Quick Routes */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium dark:text-dark-muted text-light-muted uppercase tracking-wider">Quick Routes</p>
          <button onClick={() => navigate('/vehicles')} className="flex items-center gap-1.5 text-xs text-primary hover:underline" data-testid="choose-vehicle-btn">
            <Car className="w-3.5 h-3.5" /> Change Vehicle ({vehicle.name})
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickRoutes.map((r) => (
            <button
              key={r.from}
              onClick={() => setForm(p => ({
                ...p,
                origin: r.from,
                destination: r.to,
                originCoords: r.fromCoords,
                destinationCoords: r.toCoords,
              }))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border dark:border-dark-border border-light-border dark:text-dark-muted text-light-muted dark:hover:border-primary/50 hover:border-primary/50 hover:text-primary transition-all"
              data-testid="quick-route-btn"
            >
              <Route className="w-3 h-3" />
              {r.from.split(',')[0]} → {r.to.split(',')[0]}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSubmit}
        className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border p-6 space-y-6"
        data-testid="route-planner-form"
      >
        {/* Route */}
        <div>
          <h3 className="flex items-center gap-2 font-semibold dark:text-dark-text text-light-text mb-4 text-sm uppercase tracking-wider">
            <MapPin className="w-4 h-4 text-primary" /> Route Details
          </h3>
          <div className="grid gap-4">
            {/* Starting Point (Auto-detected via GPS with live autocomplete search) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium dark:text-dark-muted text-light-muted uppercase tracking-wide">
                    Starting Point
                  </label>
                  {locationDetected && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Live Location
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => detectLiveLocation(true)}
                  disabled={isDetectingLocation}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                  title="Detect and use current GPS location"
                >
                  {isDetectingLocation ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Detecting GPS...</span>
                    </>
                  ) : (
                    <>
                      <LocateFixed className="w-3.5 h-3.5" />
                      <span>{locationDetected ? 'Refresh Location' : 'Use Current Location'}</span>
                    </>
                  )}
                </button>
              </div>

              <PlaceAutocompleteInput
                value={form.origin}
                onChange={(val) => {
                  setForm((p) => ({ ...p, origin: val, originCoords: null }));
                  if (locationDetected) setLocationDetected(false);
                }}
                onSelect={(item) => {
                  setForm((p) => ({
                    ...p,
                    origin: item.displayName || item.name,
                    originCoords: item.lat && item.lng ? { lat: item.lat, lng: item.lng } : null,
                  }));
                  setLocationDetected(false);
                }}
                placeholder={isDetectingLocation ? 'Detecting your live location...' : 'Type 3 letters (e.g. Mys, Del, Mum) or use Live GPS'}
                required
                testId="origin-input"
                accentColor="primary"
                rightAction={
                  <button
                    type="button"
                    onClick={() => detectLiveLocation(true)}
                    disabled={isDetectingLocation}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center gap-1 transition-all disabled:opacity-50"
                    title="Detect your current location"
                  >
                    {isDetectingLocation ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Navigation className="w-3 h-3" />
                    )}
                    <span className="hidden sm:inline">Live GPS</span>
                  </button>
                }
              />

              {locationDetected && (
                <p className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Detected via live network / GPS. You can also type to change starting point.
                </p>
              )}
            </div>

            {/* Destination (Live Real-Time Autocomplete from 3 letters) */}
            <div>
              <PlaceAutocompleteInput
                label="Destination"
                value={form.destination}
                onChange={(val) => setForm((p) => ({ ...p, destination: val, destinationCoords: null }))}
                onSelect={(item) => setForm((p) => ({
                  ...p,
                  destination: item.displayName || item.name,
                  destinationCoords: item.lat && item.lng ? { lat: item.lat, lng: item.lng } : null,
                }))}
                placeholder="Enter 1st 3 letters for suggestions (e.g. Mys, Del, Mum, Che)..."
                required
                testId="destination-input"
                accentColor="primary"
                tooltip="Real-time OpenStreetMap autocomplete - no mock"
              />
            </div>

            {/* Waypoints */}
            <AnimatePresence>
              {waypoints.map((wp, i) => (
                <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <PlaceAutocompleteInput
                    label={`Stop ${i + 1}`}
                    value={wp}
                    onChange={(val) => updateWaypoint(i, val)}
                    onSelect={(item) => updateWaypoint(i, item.displayName || item.name)}
                    placeholder="Enter 1st 3 letters for stop suggestions..."
                    testId={`waypoint-input-${i}`}
                    accentColor="secondary"
                    rightAction={
                      <button
                        type="button"
                        onClick={() => removeWaypoint(i)}
                        className="text-red-400 hover:text-red-500 transition-colors p-1"
                        title="Remove Stop"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    }
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {waypoints.length < 3 && (
              <button type="button" onClick={addWaypoint}
                className="flex items-center gap-2 text-xs text-secondary hover:underline py-1"
                data-testid="add-waypoint-btn"
              >
                <Plus className="w-3.5 h-3.5" /> Add Intermediate Stop ({3 - waypoints.length} remaining)
              </button>
            )}
          </div>
        </div>

        {/* Battery Settings */}
        <div>
          <h3 className="flex items-center gap-2 font-semibold dark:text-dark-text text-light-text mb-4 text-sm uppercase tracking-wider">
            <Battery className="w-4 h-4 text-secondary" /> Battery Settings
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Battery Capacity" name="batteryCapacityKwh" value={form.batteryCapacityKwh} onChange={handleChange} type="number" min={10} max={200} step={1} unit="kWh" tooltip="Total battery pack capacity" />
            <InputField label="Usable Battery" name="usableBatteryPct" value={form.usableBatteryPct} onChange={handleChange} type="number" min={50} max={100} step={1} unit="%" tooltip="Percentage available for use" />
            <InputField label="Energy Efficiency" name="efficiencyKwhPer100km" value={form.efficiencyKwhPer100km} onChange={handleChange} type="number" min={5} max={50} step={0.5} unit="kWh/100km" />
            <InputField label="Min Reserve SoC" name="minReserveSocPct" value={form.minReserveSocPct} onChange={handleChange} type="number" min={5} max={30} step={1} unit="%" tooltip="Safety buffer at destination" />
          </div>
        </div>

        {/* Advanced */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
            data-testid="toggle-advanced-btn"
          >
            <Settings className="w-4 h-4" />
            Advanced Charging Settings
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 grid grid-cols-2 gap-4"
            >
              <InputField label="Target Charge SoC" name="targetChargeSocPct" value={form.targetChargeSocPct} onChange={handleChange} type="number" min={50} max={100} step={5} unit="%" tooltip="Target SoC at charging stops" />
              <InputField label="Max Charging Power" name="chargingPowerKw" value={form.chargingPowerKw} onChange={handleChange} type="number" min={7} max={350} step={1} unit="kW" />
              <InputField label="Electricity Rate" name="electricityRatePerKwh" value={form.electricityRatePerKwh} onChange={handleChange} type="number" min={1} max={50} step={0.5} unit="₹/kWh" />
            </motion.div>
          )}
        </div>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.01 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          className="w-full py-4 rounded-xl volt-btn font-bold text-sm flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
          data-testid="calculate-route-btn"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Calculating Optimal Route...</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Calculate EV Route
              <Route className="w-5 h-5" />
            </>
          )}
        </motion.button>
      </motion.form>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-start gap-3 p-4 dark:bg-primary/5 bg-primary/5 rounded-xl border border-primary/20"
      >
        <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs dark:text-dark-muted text-light-muted">
          EcoTrack AI uses OpenStreetMap and the Overpass API for charging station discovery, OSRM routing, and weather-aware energy planning for sustainable mobility.
        </p>
      </motion.div>
    </div>
  );
};

export default RoutePlannerPage;
