import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';
import {
  TrendingUp, Zap, Battery, Route, IndianRupee, X, Plus, Car,
  CheckCircle, Clock, Shield, Users,
} from 'lucide-react';
import { getVehicles } from '../services/authService';
import { staggerContainer, staggerItem } from '../animations/variants';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const COLORS = ['#00F0FF', '#CCFF00', '#FF6B35'];

/* ── TCO Calculator ───────────────────────────────────────────── */
const calcTco = (vehicle, params) => {
  const { annualKm, petrolPricePerL, petrolKmPerL, electricityRate, years } = params;

  const evCostPerKm = (vehicle.efficiencyKwhPer100km / 100) * electricityRate;
  const petrolCostPerKm = petrolPricePerL / petrolKmPerL;
  const annualEvCost = evCostPerKm * annualKm;
  const annualPetrolCost = petrolCostPerKm * annualKm;
  const annualSavings = annualPetrolCost - annualEvCost;
  const annualMaintenance = (vehicle.annualMaintenanceLakh || 0.15) * 100000;
  const purchasePrice = vehicle.exShowroomPriceLakh * 100000;
  const totalTco = purchasePrice + (annualEvCost + annualMaintenance) * years;
  const breakEvenYears = annualSavings > 0 ? Math.ceil((purchasePrice - 500000) / annualSavings) : null;

  return {
    evCostPerKm: parseFloat(evCostPerKm.toFixed(2)),
    annualEvFuelCost: Math.round(annualEvCost),
    annualPetrolEquivalent: Math.round(annualPetrolCost),
    annualSavings: Math.round(annualSavings),
    totalSavingsOverYears: Math.round(annualSavings * years),
    annualMaintenance: Math.round(annualMaintenance),
    totalTco: Math.round(totalTco / 100000),
    breakEvenYears,
    purchasePriceLakh: vehicle.exShowroomPriceLakh,
  };
};

/* ── Spec Row ─────────────────────────────────────────────────── */
const SpecRow = ({ label, values, unit = '', highlight = false, format }) => (
  <div className={`grid gap-2 py-3 px-4 rounded-xl mb-1 ${highlight ? 'dark:bg-primary/5 bg-primary/5 border border-primary/15' : 'dark:bg-dark-highlight bg-light-highlight'}`}
    style={{ gridTemplateColumns: `180px repeat(${values.length}, 1fr)` }}
  >
    <span className="text-xs dark:text-dark-muted text-light-muted font-medium self-center">{label}</span>
    {values.map((v, i) => (
      <span key={i} className={`text-sm font-bold stat-number text-center self-center ${highlight ? 'text-primary' : 'dark:text-dark-text text-light-text'}`}>
        {format ? format(v) : v}{unit ? <span className="text-xs font-normal ml-0.5 dark:text-dark-muted text-light-muted">{unit}</span> : null}
      </span>
    ))}
  </div>
);

/* ── Vehicle Selector ─────────────────────────────────────────── */
const VehicleSelector = ({ vehicles, selected, onSelect, onRemove, slot, color }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = vehicles.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || v.brand.toLowerCase().includes(search.toLowerCase()));

  if (selected) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="relative rounded-2xl border-2 p-4"
        style={{ borderColor: `${color}40` }}
      >
        <div className="absolute -top-2 -right-2">
          <button onClick={() => onRemove(slot)} className="w-5 h-5 rounded-full bg-red-400 text-white flex items-center justify-center hover:bg-red-500 transition-colors" data-testid="remove-vehicle-btn">
            <X className="w-3 h-3" />
          </button>
        </div>
        <div className="h-1 rounded-full mb-3" style={{ background: `linear-gradient(90deg, ${color}44, ${color})` }} />
        <p className="text-xs dark:text-dark-muted text-light-muted">{selected.brand}</p>
        <p className="font-bold dark:text-dark-text text-light-text text-sm leading-tight">{selected.name}</p>
        <p className="text-xs mt-1" style={{ color }}>{selected.rangeKm} km · {selected.batteryCapacityKwh} kWh</p>
        <p className="text-xs font-bold mt-1 dark:text-dark-text text-light-text">₹{selected.exShowroomPriceLakh} L</p>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full rounded-2xl border-2 border-dashed dark:border-dark-border border-light-border p-5 flex flex-col items-center gap-2 hover:border-primary/40 transition-colors"
        style={{ borderColor: open ? `${color}60` : undefined }}
        data-testid={`add-vehicle-slot-${slot}`}
      >
        <Plus className="w-5 h-5 dark:text-dark-muted text-light-muted" style={{ color: open ? color : undefined }} />
        <p className="text-xs dark:text-dark-muted text-light-muted">Add Vehicle {slot + 1}</p>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-2 left-0 right-0 z-50 dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border shadow-2xl overflow-hidden"
            style={{ minWidth: '260px' }}
          >
            <div className="p-3 border-b dark:border-dark-border border-light-border">
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search vehicles..."
                className="w-full px-3 py-2 text-sm rounded-xl dark:bg-dark-highlight bg-light-highlight dark:text-dark-text text-light-text focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filtered.map(v => (
                <button key={v.id} onClick={() => { onSelect(slot, v); setOpen(false); setSearch(''); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:dark:bg-dark-highlight hover:bg-light-highlight transition-colors text-left"
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: v.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium dark:text-dark-text text-light-text truncate">{v.name}</p>
                    <p className="text-xs dark:text-dark-muted text-light-muted">₹{v.exShowroomPriceLakh}L · {v.rangeKm}km</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Main Page ─────────────────────────────────────────────────── */
const EVComparisonPage = () => {
  const [allVehicles, setAllVehicles] = useState([]);
  const [selected, setSelected] = useState([null, null, null]);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({
    annualKm: 15000,
    petrolPricePerL: 100,
    petrolKmPerL: 15,
    electricityRate: 8,
    years: 5,
  });

  useEffect(() => {
    getVehicles()
      .then(res => {
        setAllVehicles(res.data.data.vehicles);
        // Pre-select first 2 popular vehicles
        const popular = res.data.data.vehicles.filter(v => v.popular).slice(0, 2);
        setSelected([popular[0] || null, popular[1] || null, null]);
      })
      .catch(() => toast.error('Failed to load vehicles'))
      .finally(() => setLoading(false));
  }, []);

  const activeVehicles = selected.filter(Boolean);

  const handleSelect = (slot, vehicle) => {
    if (selected.some((v, i) => v?.id === vehicle.id && i !== slot)) {
      toast('Already added', { icon: '⚠️' });
      return;
    }
    setSelected(prev => { const n = [...prev]; n[slot] = vehicle; return n; });
  };

  const handleRemove = (slot) => setSelected(prev => { const n = [...prev]; n[slot] = null; return n; });

  const tcoData = activeVehicles.map(v => calcTco(v, params));

  // Bar chart data
  const barData = [
    { name: 'Price (₹L)', ...Object.fromEntries(activeVehicles.map((v, i) => [v.name.split(' ').slice(-2).join(' '), v.exShowroomPriceLakh])) },
    { name: 'Range (km)', ...Object.fromEntries(activeVehicles.map((v, i) => [v.name.split(' ').slice(-2).join(' '), v.rangeKm])) },
    { name: 'Battery (kWh)', ...Object.fromEntries(activeVehicles.map((v, i) => [v.name.split(' ').slice(-2).join(' '), v.batteryCapacityKwh])) },
    { name: 'Charging (kW)', ...Object.fromEntries(activeVehicles.map((v, i) => [v.name.split(' ').slice(-2).join(' '), v.chargingPowerKw])) },
  ];

  const annualCostData = activeVehicles.map((v, i) => ({
    name: v.name.split(' ').slice(-2).join(' '),
    'Annual Fuel (₹)': tcoData[i]?.annualEvFuelCost || 0,
    'Annual Maint. (₹)': tcoData[i]?.annualMaintenance || 0,
    fill: COLORS[i],
  }));

  // Radar data (normalised)
  const radarData = ['Range', 'Efficiency', 'Charging Speed', 'Battery', 'Affordability'].map(attr => {
    const entry = { attr };
    activeVehicles.forEach((v, i) => {
      const score = {
        Range: (v.rangeKm / 700) * 100,
        Efficiency: ((30 - v.efficiencyKwhPer100km) / 25) * 100,
        'Charging Speed': Math.min((v.chargingPowerKw / 250) * 100, 100),
        Battery: (v.batteryCapacityKwh / 80) * 100,
        Affordability: Math.max(0, ((80 - v.exShowroomPriceLakh) / 72) * 100),
      }[attr];
      entry[v.name.split(' ').slice(-2).join(' ')] = Math.min(100, Math.round(score));
    });
    return entry;
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="dark:bg-dark-surface bg-white border dark:border-dark-border border-light-border rounded-xl px-3 py-2 text-sm shadow-xl">
        <p className="dark:text-dark-muted text-light-muted text-xs mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.fill || p.stroke || COLORS[i] }} className="font-bold">
            {p.name}: {typeof p.value === 'number' && p.value > 1000 ? `₹${p.value.toLocaleString('en-IN')}` : p.value}
          </p>
        ))}
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-full"><LoadingSpinner size="lg" text="Loading comparison tool..." /></div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold dark:text-dark-text text-light-text">EV Price Comparison</h2>
        <p className="text-sm dark:text-dark-muted text-light-muted mt-0.5">Compare up to 3 EVs side-by-side — specs, cost, TCO & savings</p>
      </motion.div>

      {/* Vehicle Selectors */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4"
      >
        {[0, 1, 2].map(slot => (
          <VehicleSelector
            key={slot}
            vehicles={allVehicles}
            selected={selected[slot]}
            onSelect={handleSelect}
            onRemove={handleRemove}
            slot={slot}
            color={COLORS[slot]}
          />
        ))}
      </motion.div>

      {activeVehicles.length < 2 && (
        <div className="text-center py-10 dark:text-dark-muted text-light-muted text-sm">
          <Car className="w-10 h-10 mx-auto mb-2 opacity-30" />
          Select at least 2 vehicles to compare
        </div>
      )}

      {activeVehicles.length >= 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

          {/* Spec Comparison */}
          <div className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border p-5">
            <h3 className="font-bold dark:text-dark-text text-light-text text-sm mb-4 flex items-center gap-2">
              <Car className="w-4 h-4 text-primary" /> Specification Comparison
            </h3>
            <div className="overflow-x-auto">
              {/* Column headers */}
              <div className="grid gap-2 py-2 px-4 mb-1" style={{ gridTemplateColumns: `180px repeat(${activeVehicles.length}, 1fr)` }}>
                <span className="text-xs dark:text-dark-muted text-light-muted font-semibold uppercase tracking-wide">Spec</span>
                {activeVehicles.map((v, i) => (
                  <div key={v.id} className="text-center">
                    <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: COLORS[i] }} />
                    <p className="text-xs font-bold dark:text-dark-text text-light-text">{v.name.split(' ').slice(0, 2).join(' ')}</p>
                  </div>
                ))}
              </div>
              <SpecRow label="Ex-Showroom Price" values={activeVehicles.map(v => `₹${v.exShowroomPriceLakh}L`)} highlight />
              <SpecRow label="Range" values={activeVehicles.map(v => v.rangeKm)} unit=" km" />
              <SpecRow label="Battery Capacity" values={activeVehicles.map(v => v.batteryCapacityKwh)} unit=" kWh" />
              <SpecRow label="Max Charging Power" values={activeVehicles.map(v => v.chargingPowerKw)} unit=" kW" />
              <SpecRow label="Efficiency" values={activeVehicles.map(v => v.efficiencyKwhPer100km)} unit=" kWh/100km" />
              <SpecRow label="Top Speed" values={activeVehicles.map(v => v.topSpeedKmh)} unit=" km/h" />
              <SpecRow label="Seats" values={activeVehicles.map(v => v.seats || 5)} />
              <SpecRow label="Warranty" values={activeVehicles.map(v => v.warranty || '—')} />
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border p-5">
              <h3 className="font-bold dark:text-dark-text text-light-text text-sm mb-4 flex items-center gap-2">
                <Battery className="w-4 h-4 text-secondary" /> Key Metrics
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D334233" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  {activeVehicles.map((v, i) => (
                    <Bar key={v.id} dataKey={v.name.split(' ').slice(-2).join(' ')} fill={COLORS[i]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Radar Chart */}
            <div className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border p-5">
              <h3 className="font-bold dark:text-dark-text text-light-text text-sm mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Performance Radar
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#2D3342" />
                  <PolarAngleAxis dataKey="attr" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  {activeVehicles.map((v, i) => (
                    <Radar key={v.id} name={v.name.split(' ').slice(-2).join(' ')} dataKey={v.name.split(' ').slice(-2).join(' ')}
                      stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} strokeWidth={2}
                    />
                  ))}
                  <Legend formatter={(val) => <span style={{ color: '#94A3B8', fontSize: '11px' }}>{val}</span>} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TCO Calculator */}
          <div className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border p-5">
            <h3 className="font-bold dark:text-dark-text text-light-text text-sm mb-4 flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-secondary" /> Total Cost of Ownership Calculator
            </h3>

            {/* Params */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 p-4 dark:bg-dark-highlight bg-light-highlight rounded-xl">
              {[
                { label: 'Annual KMs', key: 'annualKm', unit: 'km', min: 1000, max: 50000, step: 500 },
                { label: 'Petrol Price', key: 'petrolPricePerL', unit: '₹/L', min: 80, max: 130, step: 1 },
                { label: 'Petrol Mileage', key: 'petrolKmPerL', unit: 'km/L', min: 8, max: 25, step: 0.5 },
                { label: 'Electricity Rate', key: 'electricityRate', unit: '₹/kWh', min: 5, max: 20, step: 0.5 },
                { label: 'Ownership Years', key: 'years', unit: 'yrs', min: 1, max: 10, step: 1 },
              ].map(p => (
                <div key={p.key}>
                  <label className="block text-xs dark:text-dark-muted text-light-muted mb-1">{p.label}</label>
                  <div className="relative">
                    <input type="number" value={params[p.key]} min={p.min} max={p.max} step={p.step}
                      onChange={e => setParams(prev => ({ ...prev, [p.key]: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-2 pr-10 py-2 text-sm rounded-lg border dark:border-dark-border border-light-border dark:bg-dark-surface bg-white dark:text-dark-text text-light-text focus:outline-none focus:border-primary"
                      data-testid={`tco-param-${p.key}`}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs dark:text-dark-muted text-light-muted">{p.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* TCO Cards */}
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${activeVehicles.length}, 1fr)` }}>
              {activeVehicles.map((v, i) => {
                const tco = tcoData[i];
                return (
                  <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className="rounded-2xl p-4 border" style={{ borderColor: `${COLORS[i]}30`, background: `${COLORS[i]}08` }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                      <p className="font-bold text-sm dark:text-dark-text text-light-text">{v.name.split(' ').slice(0, 3).join(' ')}</p>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        { label: 'Ex-Showroom', value: `₹${v.exShowroomPriceLakh}L`, highlight: true },
                        { label: 'Cost/km', value: `₹${tco.evCostPerKm}` },
                        { label: 'Annual Fuel Cost', value: `₹${tco.annualEvFuelCost.toLocaleString('en-IN')}` },
                        { label: 'Annual Maintenance', value: `₹${tco.annualMaintenance.toLocaleString('en-IN')}` },
                        { label: 'Annual Savings vs Petrol', value: `₹${tco.annualSavings.toLocaleString('en-IN')}`, green: true },
                        { label: `${params.years}yr Total Savings`, value: `₹${tco.totalSavingsOverYears.toLocaleString('en-IN')}`, green: true, bold: true },
                        { label: `${params.years}yr TCO`, value: `₹${tco.totalTco}L`, bold: true },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between">
                          <span className="text-xs dark:text-dark-muted text-light-muted">{item.label}</span>
                          <span className={`text-sm font-semibold stat-number ${item.highlight ? 'dark:text-dark-text text-light-text' : item.green ? 'text-emerald-400' : 'dark:text-dark-text text-light-text'} ${item.bold ? 'text-base' : ''}`} style={item.highlight ? { color: COLORS[i] } : {}}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {tco.breakEvenYears && (
                      <div className="mt-3 p-2.5 rounded-xl dark:bg-dark-highlight bg-light-highlight text-center">
                        <p className="text-xs dark:text-dark-muted text-light-muted">Break-even vs Petrol</p>
                        <p className="font-bold stat-number text-secondary">{tco.breakEvenYears} years</p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Annual cost bar chart */}
            <div className="mt-5">
              <h4 className="text-xs font-semibold dark:text-dark-muted text-light-muted uppercase tracking-wider mb-3">Annual Running Cost Breakdown</h4>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={annualCostData} layout="vertical" barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D334233" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Annual Fuel (₹)" fill="#00F0FF" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Annual Maint. (₹)" fill="#CCFF00" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Verdict */}
          <div className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border p-5">
            <h3 className="font-bold dark:text-dark-text text-light-text text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Quick Verdict
            </h3>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${activeVehicles.length}, 1fr)` }}>
              {activeVehicles.map((v, i) => {
                const tco = tcoData[i];
                const badges = [];
                if (v.exShowroomPriceLakh === Math.min(...activeVehicles.map(x => x.exShowroomPriceLakh))) badges.push({ label: 'Most Affordable', color: 'text-emerald-400 bg-emerald-400/10' });
                if (v.rangeKm === Math.max(...activeVehicles.map(x => x.rangeKm))) badges.push({ label: 'Best Range', color: 'text-primary bg-primary/10' });
                if (v.chargingPowerKw === Math.max(...activeVehicles.map(x => x.chargingPowerKw))) badges.push({ label: 'Fastest Charging', color: 'text-secondary bg-secondary/10' });
                if (v.efficiencyKwhPer100km === Math.min(...activeVehicles.map(x => x.efficiencyKwhPer100km))) badges.push({ label: 'Most Efficient', color: 'text-orange-400 bg-orange-400/10' });
                if (tco.annualSavings === Math.max(...tcoData.map(t => t.annualSavings))) badges.push({ label: 'Best Savings', color: 'text-yellow-400 bg-yellow-400/10' });

                return (
                  <div key={v.id} className="rounded-xl p-4 border" style={{ borderColor: `${COLORS[i]}30` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                      <p className="font-bold text-sm dark:text-dark-text text-light-text truncate">{v.name}</p>
                    </div>
                    {badges.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {badges.map(b => (
                          <span key={b.label} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${b.color}`}>{b.label}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs dark:text-dark-muted text-light-muted">Good all-rounder choice</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EVComparisonPage;
