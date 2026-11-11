import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin, Clock, Zap, Route, Battery, Navigation, Car,
  ChevronDown, ChevronUp, Eye, Calendar, ExternalLink,
} from 'lucide-react';
import { getShareByToken } from '../services/authService';
import { formatDistance, formatTime, formatCost } from '../utils/helpers';
import LoadingSpinner from '../components/common/LoadingSpinner';

const maneuverIcon = (type, modifier) => {
  const mod = { left: '←', right: '→', straight: '↑', 'slight left': '↖', 'slight right': '↗', 'sharp left': '◄', 'sharp right': '►', uturn: '↩' };
  const base = { turn: '↪', depart: '▶', arrive: '⬛', merge: '⇌', roundabout: '↺', rotary: '↺', default: '→' };
  return mod[modifier] || base[type] || base.default;
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 flex items-center gap-3 border border-white/10">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-bold text-white text-sm stat-number">{value}</p>
    </div>
  </div>
);

const SharedTripPage = () => {
  const { token } = useParams();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNav, setShowNav] = useState(false);

  useEffect(() => {
    getShareByToken(token)
      .then(res => setData(res.data.data))
      .catch(err => setError(err.response?.data?.message || 'Link not found or expired'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!data || !mapRef.current || mapInstanceRef.current) return;
    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

    const { tripData } = data;
    if (tripData.routeGeometry?.coordinates?.length) {
      const latlngs = tripData.routeGeometry.coordinates.map(([lng, lat]) => [lat, lng]);
      L.polyline(latlngs, { color: '#00F0FF', weight: 4, opacity: 0.85 }).addTo(map);
      map.fitBounds(L.polyline(latlngs).getBounds(), { padding: [40, 40] });
    }
    if (tripData.origin?.lat) {
      L.circleMarker([tripData.origin.lat, tripData.origin.lng], { radius: 8, color: '#CCFF00', fillColor: '#CCFF00', fillOpacity: 1, weight: 2 })
        .bindPopup(`<b>Start</b><br>${tripData.origin.address}`).addTo(map);
    }
    if (tripData.destination?.lat) {
      L.circleMarker([tripData.destination.lat, tripData.destination.lng], { radius: 8, color: '#FF6B35', fillColor: '#FF6B35', fillOpacity: 1, weight: 2 })
        .bindPopup(`<b>End</b><br>${tripData.destination.address}`).addTo(map);
    }
    (tripData.chargingStops || []).forEach((stop, i) => {
      if (stop.location?.lat) {
        L.circleMarker([stop.location.lat, stop.location.lng], { radius: 7, color: '#00F0FF', fillColor: '#0B0E14', fillOpacity: 1, weight: 2 })
          .bindPopup(`<b>Stop ${i + 1}</b><br>${stop.stationName || 'Charging Stop'}`).addTo(map);
      }
    });
  }, [data]);

  if (loading) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <LoadingSpinner size="lg" text="Loading trip..." />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center gap-4 p-6">
      <div className="w-16 h-16 rounded-2xl bg-red-400/10 flex items-center justify-center">
        <Route className="w-8 h-8 text-red-400" />
      </div>
      <h1 className="text-xl font-bold text-white">Link Not Found</h1>
      <p className="text-slate-400 text-sm text-center">{error}</p>
      <Link to="/" className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
        Go to EcoTrack AI
      </Link>
    </div>
  );

  const { tripData, vehicle, viewCount, createdAt, expiresAt } = data;
  const { summary, origin, destination, chargingStops = [], navSteps = [] } = tripData;

  return (
    <div className="min-h-screen bg-dark-bg" style={{ fontFamily: "'Manrope', sans-serif" }}>
      {/* Nav bar */}
      <div className="border-b border-white/10 backdrop-blur-sm bg-dark-bg/80 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-primary font-bold text-lg" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>EcoTrack AI</span>
            <span className="text-xs text-slate-400 hidden sm:block">Shared EV Trip</span>
          </Link>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {viewCount} views</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Expires {new Date(expiresAt).toLocaleDateString('en-IN')}</span>
            <Link to="/route-planner" className="flex items-center gap-1 text-primary hover:underline ml-2">
              <ExternalLink className="w-3 h-3" /> Plan your own
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Route Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-5"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-secondary" />
              <p className="font-bold text-white text-sm">{origin?.address?.split(',').slice(0, 2).join(',')}</p>
            </div>
            <div className="flex-1 h-px bg-white/10 min-w-4" />
            <Route className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 h-px bg-white/10 min-w-4" />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-400" />
              <p className="font-bold text-white text-sm">{destination?.address?.split(',').slice(0, 2).join(',')}</p>
            </div>
          </div>
          {vehicle?.name && (
            <div className="flex items-center gap-1.5 mt-3">
              <Car className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-400">{vehicle.name}</span>
              <span className="text-xs text-slate-600">·</span>
              <span className="text-xs text-slate-500">Shared on {new Date(createdAt).toLocaleDateString('en-IN')}</span>
            </div>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <StatCard icon={MapPin} label="Distance" value={formatDistance(summary?.totalDistanceKm)} color="bg-primary/10 text-primary" />
          <StatCard icon={Clock} label="Total Time" value={formatTime(summary?.totalTripTimeMin)} color="bg-secondary/10 text-secondary" />
          <StatCard icon={Zap} label="Charging Stops" value={`${summary?.numberOfChargingStops || 0} stops`} color="bg-emerald-400/10 text-emerald-400" />
          <StatCard icon={Route} label="Trip Cost" value={formatCost(summary?.totalCostInr ?? summary?.totalCostUsd)} color="bg-orange-400/10 text-orange-400" />
        </motion.div>

        {/* Map */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-white text-sm">Route Map</h3>
            <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary inline-block" /> Start</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> End</span>
              {chargingStops.length > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border-2 border-primary bg-dark-bg inline-block" /> Charge</span>}
            </div>
          </div>
          <div ref={mapRef} style={{ height: '360px' }} data-testid="share-map" />
        </motion.div>

        {/* Charging Stops */}
        {chargingStops.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white/5 rounded-2xl border border-white/10 p-5"
          >
            <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-secondary" /> Charging Stops ({chargingStops.length})
            </h3>
            <div className="space-y-3">
              {chargingStops.map((stop, i) => (
                <div key={i} className="rounded-xl bg-white/5 p-4 flex flex-wrap items-center gap-4">
                  <div className="w-7 h-7 rounded-full bg-secondary/10 border border-secondary/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-secondary">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{stop.stationName || `Charging Stop ${i + 1}`}</p>
                    <p className="text-xs text-slate-400 truncate">{stop.address || '—'}</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { label: 'SoC', value: `${stop.arrivalSocPct?.toFixed(0)}% → ${stop.departureSocPct?.toFixed(0)}%`, color: 'text-primary' },
                      { label: 'Energy', value: `${stop.energyAddedKwh?.toFixed(1)} kWh`, color: 'text-secondary' },
                      { label: 'Time', value: `${stop.chargingTimeMin?.toFixed(0)} min`, color: 'text-emerald-400' },
                      { label: 'Cost', value: `₹${(stop.costUsd || 0).toFixed(2)}`, color: 'text-orange-400' },
                    ].map(item => (
                      <div key={item.label} className="text-center">
                        <p className="text-xs text-slate-400">{item.label}</p>
                        <p className={`text-sm font-bold stat-number ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Vehicle + Energy Summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
            <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
              <Battery className="w-4 h-4 text-primary" /> Energy & Timing
            </h3>
            {[
              ['Total Distance', `${summary?.totalDistanceKm?.toFixed(1)} km`],
              ['Driving Time', formatTime(summary?.totalDrivingTimeMin)],
              ['Charging Time', formatTime(summary?.totalChargingTimeMin)],
              ['Total Energy', `${summary?.totalEnergyKwh?.toFixed(1)} kWh`],
              ['Final Battery', `${summary?.finalSocPct?.toFixed(1)}%`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-xs text-slate-400">{label}</span>
                <span className="text-sm font-semibold text-white stat-number">{value}</span>
              </div>
            ))}
          </div>

          <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
            <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
              <Car className="w-4 h-4 text-secondary" /> Vehicle
            </h3>
            {vehicle ? [
              ['Vehicle', vehicle.name],
              ['Battery', `${vehicle.batteryCapacityKwh} kWh`],
              ['Efficiency', `${vehicle.efficiencyKwhPer100km} kWh/100km`],
              ['Max Charging', `${vehicle.chargingPowerKw} kW`],
              ['Electricity Rate', `₹${vehicle.electricityRatePerKwh}/kWh`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-xs text-slate-400">{label}</span>
                <span className="text-sm font-semibold text-white">{value}</span>
              </div>
            )) : <p className="text-sm text-slate-400">No vehicle data</p>}
          </div>
        </motion.div>

        {/* Turn-by-Turn Navigation */}
        {navSteps.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden"
          >
            <button
              onClick={() => setShowNav(!showNav)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              data-testid="toggle-nav-btn"
            >
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary" />
                <span className="font-bold text-white text-sm">Turn-by-Turn Navigation</span>
                <span className="text-xs text-slate-400">({navSteps.length} steps)</span>
              </div>
              {showNav ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showNav && (
              <div className="max-h-80 overflow-y-auto border-t border-white/10">
                {navSteps.map((step, i) => (
                  <div key={i} className={`flex items-start gap-3 px-5 py-3 ${i % 2 === 0 ? 'bg-white/5' : ''}`}>
                    <span className="text-primary font-mono text-lg flex-shrink-0 w-6 text-center">{maneuverIcon(step.type, step.modifier)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{step.instruction}</p>
                      {step.road && <p className="text-xs text-slate-400">{step.road}</p>}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs font-semibold stat-number text-white">{step.distanceKm?.toFixed(1)} km</p>
                      <p className="text-xs text-slate-400">{step.durationMin?.toFixed(0)} min</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* CTA footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-center py-4"
        >
          <p className="text-slate-500 text-sm mb-3">Plan your own EV route with EcoTrack AI</p>
          <Link to="/route-planner"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-dark-bg font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Plan Route Now
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default SharedTripPage;
