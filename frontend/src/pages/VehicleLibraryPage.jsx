import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Battery, Zap, Search, Filter, CheckCircle, Route, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { getVehicles } from '../services/authService';
import { updateVehicle } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { staggerContainer, staggerItem } from '../animations/variants';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const getTypeColor = (kw) => {
  if (kw >= 100) return { bg: 'bg-primary/10', text: 'text-primary', label: 'Ultra-Fast DC' };
  if (kw >= 50) return { bg: 'bg-secondary/10', text: 'text-secondary', label: 'DC Fast' };
  if (kw >= 22) return { bg: 'bg-emerald-400/10', text: 'text-emerald-400', label: 'AC Fast' };
  return { bg: 'bg-slate-400/10', text: 'text-slate-400', label: 'Slow AC' };
};

const VehicleCard = ({ vehicle, isSelected, onSelect }) => {
  const chargeType = getTypeColor(vehicle.chargingPowerKw);
  const [imgErr, setImgErr] = useState(false);

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={() => onSelect(vehicle)}
      className={`relative cursor-pointer rounded-2xl border overflow-hidden transition-all duration-200 group
        ${isSelected
          ? 'border-primary shadow-lg shadow-primary/10'
          : 'dark:border-dark-border border-light-border dark:bg-dark-surface bg-white dark:hover:border-primary/40 hover:border-primary/40'
        }`}
      data-testid="vehicle-card"
    >
      {/* Selected Badge */}
      {isSelected && (
        <div className="absolute top-3 right-3 z-10">
          <CheckCircle className="w-5 h-5 text-primary drop-shadow-md" />
        </div>
      )}

      {/* Vehicle Image */}
      <div className="relative h-40 overflow-hidden">
        {vehicle.image && !imgErr ? (
          <img
            src={vehicle.image}
            alt={vehicle.name}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${vehicle.color}22, ${vehicle.color}55)` }}>
            <Car className="w-16 h-16 opacity-30" style={{ color: vehicle.color }} />
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
        {/* Tags on image */}
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          {vehicle.tag && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold backdrop-blur-sm ${vehicle.tag === 'New' ? 'bg-emerald-400/80 text-white' : vehicle.tag === 'Best Seller' ? 'bg-primary/80 text-dark-bg' : 'bg-secondary/80 text-dark-bg'}`}>
              {vehicle.tag}
            </span>
          )}
          {vehicle.popular && !vehicle.tag && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-400/80 text-white font-semibold backdrop-blur-sm">Popular</span>}
        </div>
        {/* Price on image bottom */}
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
          <div>
            <p className="text-white/70 text-xs">{vehicle.brand}</p>
            <p className="text-white font-bold text-sm leading-tight">{vehicle.name.replace(vehicle.brand + ' ', '')}</p>
          </div>
          {vehicle.exShowroomPriceLakh && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-black/40 backdrop-blur-sm text-white">₹{vehicle.exShowroomPriceLakh}L</span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 dark:bg-dark-surface bg-white">
        <p className="text-xs dark:text-dark-muted text-light-muted mt-0.5 mb-3">{vehicle.segment} · {vehicle.year} · {vehicle.country}</p>

        {/* Colour strip */}
        <div className="h-0.5 rounded-full mb-3" style={{ background: `linear-gradient(90deg, ${vehicle.color}44, ${vehicle.color})` }} />

        {/* Key Stats */}
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <div>
            <p className="text-xs dark:text-dark-muted text-light-muted">Range</p>
            <p className="font-bold stat-number text-sm dark:text-dark-text text-light-text">{vehicle.rangeKm}<span className="text-xs ml-0.5 font-normal">km</span></p>
          </div>
          <div>
            <p className="text-xs dark:text-dark-muted text-light-muted">Battery</p>
            <p className="font-bold stat-number text-sm dark:text-dark-text text-light-text">{vehicle.batteryCapacityKwh}<span className="text-xs ml-0.5 font-normal">kWh</span></p>
          </div>
          <div>
            <p className="text-xs dark:text-dark-muted text-light-muted">Speed</p>
            <p className="font-bold stat-number text-sm dark:text-dark-text text-light-text">{vehicle.topSpeedKmh}<span className="text-xs ml-0.5 font-normal">km/h</span></p>
          </div>
        </div>

        {/* Charge Type & Telematics */}
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${chargeType.bg} ${chargeType.text}`}>
            {chargeType.label}
          </span>
          <span className="text-xs dark:text-dark-muted text-light-muted">{vehicle.chargingPowerKw} kW</span>
        </div>

        {/* Telematics Protocol Support */}
        {vehicle.telematicsSupport && (
          <div className="mt-2.5 pt-2 border-t dark:border-dark-border/40 border-light-border/40 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1 font-mono text-[10px]">
              <Cpu className="w-3 h-3 text-cyan-400" />
              {vehicle.telematicsSupport.oemApiProvider?.split(' ')[0] || 'OBD-II'} Ready
            </span>
            <span className="text-emerald-400 font-mono font-bold text-[10px]">
              {vehicle.telematicsSupport.packNominalVoltageV}V Bus
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};


const VehicleLibraryPage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [brands, setBrands] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeBrand, setActiveBrand] = useState('All');
  const [activeSegment, setActiveSegment] = useState('All');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getVehicles()
      .then(res => {
        setVehicles(res.data.data.vehicles);
        setBrands(['All', ...res.data.data.brands]);
        setSegments(['All', ...res.data.data.segments]);
        // Pre-select user's current vehicle if it exists in library
        const current = res.data.data.vehicles.find(v => v.name === user?.defaultVehicle?.name);
        if (current) setSelectedVehicle(current);
      })
      .catch(() => toast.error('Failed to load vehicles'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = vehicles.filter(v => {
    const matchBrand = activeBrand === 'All' || v.brand === activeBrand;
    const matchSeg = activeSegment === 'All' || v.segment === activeSegment;
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.brand.toLowerCase().includes(search.toLowerCase());
    return matchBrand && matchSeg && matchSearch;
  });

  const handleSelect = (vehicle) => {
    setSelectedVehicle(v => v?.id === vehicle.id ? null : vehicle);
  };

  const handleApply = async () => {
    if (!selectedVehicle) return;
    setSaving(true);
    try {
      const vehicleConfig = {
        name: selectedVehicle.name,
        batteryCapacityKwh: selectedVehicle.batteryCapacityKwh,
        usableBatteryPct: selectedVehicle.usableBatteryPct,
        efficiencyKwhPer100km: selectedVehicle.efficiencyKwhPer100km,
        minReserveSocPct: selectedVehicle.minReserveSocPct,
        targetChargeSocPct: selectedVehicle.targetChargeSocPct,
        chargingPowerKw: selectedVehicle.chargingPowerKw,
        electricityRatePerKwh: selectedVehicle.electricityRatePerKwh,
      };
      await updateVehicle(vehicleConfig);
      updateUser({ defaultVehicle: vehicleConfig });
      toast.success(`${selectedVehicle.name} set as your vehicle!`);
      navigate('/route-planner');
    } catch {
      toast.error('Failed to update vehicle');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><LoadingSpinner size="lg" text="Loading EV Library..." /></div>;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold dark:text-dark-text text-light-text">EV Vehicle Library</h2>
          <p className="text-sm dark:text-dark-muted text-light-muted mt-0.5">{filtered.length} vehicles — Select your EV for accurate route planning</p>
        </div>
        {selectedVehicle && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleApply} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 volt-btn rounded-xl text-sm font-semibold disabled:opacity-60"
            data-testid="apply-vehicle-btn"
          >
            <CheckCircle className="w-4 h-4" />
            {saving ? 'Setting...' : `Use ${selectedVehicle.name.split(' ').slice(-1)[0]}`}
          </motion.button>
        )}
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-dark-muted text-light-muted" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search vehicles..."
            className="pl-9 pr-4 py-2 rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-surface bg-white dark:text-dark-text text-light-text text-sm focus:outline-none focus:border-primary w-48"
            data-testid="vehicle-search-input"
          />
        </div>

        {/* Brand filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {brands.map(b => (
            <button key={b} onClick={() => setActiveBrand(b)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeBrand === b ? 'bg-primary text-dark-bg' : 'dark:bg-dark-surface bg-white border dark:border-dark-border border-light-border dark:text-dark-muted text-light-muted dark:hover:text-dark-text hover:text-light-text'}`}
              data-testid="brand-filter-btn"
            >{b}</button>
          ))}
        </div>
      </div>

      {/* Segment chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Filter className="w-3.5 h-3.5 dark:text-dark-muted text-light-muted" />
        {segments.map(s => (
          <button key={s} onClick={() => setActiveSegment(s)}
            className={`px-3 py-1 rounded-full text-xs transition-all border ${activeSegment === s ? 'border-secondary bg-secondary/10 text-secondary' : 'dark:border-dark-border border-light-border dark:text-dark-muted text-light-muted dark:hover:border-secondary/40 hover:border-secondary/40'}`}
          >{s}</button>
        ))}
      </div>

      {/* Vehicle Grid */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(vehicle => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            isSelected={selectedVehicle?.id === vehicle.id}
            onSelect={handleSelect}
          />
        ))}
      </motion.div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Car className="w-12 h-12 dark:text-dark-muted text-light-muted mx-auto mb-3 opacity-40" />
          <p className="dark:text-dark-muted text-light-muted">No vehicles found matching your filters</p>
        </div>
      )}

      {/* Selected vehicle floating bar */}
      <AnimatePresence>
        {selectedVehicle && (
          <motion.div
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 dark:bg-dark-surface bg-white border border-primary/30 rounded-2xl shadow-2xl shadow-primary/20 px-6 py-4 flex items-center gap-6 min-w-[400px]"
            data-testid="selected-vehicle-bar"
          >
            <div className="flex-1">
              <p className="text-xs dark:text-dark-muted text-light-muted">Selected Vehicle</p>
              <p className="font-bold dark:text-dark-text text-light-text">{selectedVehicle.name}</p>
              <p className="text-xs text-primary">{selectedVehicle.batteryCapacityKwh} kWh · {selectedVehicle.rangeKm} km range · {selectedVehicle.chargingPowerKw} kW charging</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate('/route-planner', { state: { vehicle: selectedVehicle } })} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
                <Route className="w-4 h-4" /> Plan Route
              </button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleApply} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 volt-btn rounded-xl text-sm font-semibold">
                <CheckCircle className="w-4 h-4" /> {saving ? '...' : 'Set as Default'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VehicleLibraryPage;
