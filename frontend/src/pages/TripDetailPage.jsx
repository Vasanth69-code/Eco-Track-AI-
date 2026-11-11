import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  ArrowLeft, MapPin, Clock, Zap, Route, Battery, Navigation,
  Download, Trash2, ChevronDown, ChevronUp, Car, Share2, ExternalLink
} from 'lucide-react';
import { getTripById, deleteTrip } from '../services/authService';
import { exportTripPDF } from '../utils/pdfExport';
import { formatDistance, formatTime, formatCost } from '../utils/helpers';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ShareModal } from '../components/common/ShareModal';
import StationDetailDrawer from '../components/common/StationDetailDrawer';
import LiveNavigationOverlay from '../components/navigation/LiveNavigationOverlay';
import toast from 'react-hot-toast';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const startIcon = new L.DivIcon({
  html: `<div style="background:#10B981;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #0B0E14;box-shadow:0 0 10px rgba(16,185,129,0.8);color:#0B0E14;font-weight:bold;font-size:12px;">A</div>`,
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const endIcon = new L.DivIcon({
  html: `<div style="background:#F59E0B;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #0B0E14;box-shadow:0 0 10px rgba(245,158,11,0.8);color:#0B0E14;font-weight:bold;font-size:12px;">B</div>`,
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const chargingIcon = new L.DivIcon({
  html: `<div style="background:#00F0FF;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #0B0E14;box-shadow:0 0 10px rgba(0,240,255,0.8)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#0B0E14"><path d="M13 2L4.5 13.5H11L11 22 19.5 10.5H13L13 2Z"/></svg>
  </div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Auto-fits the map viewport around the route bounds and invalidates size
const MapAutoFit = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [40, 40] });
      } catch (err) {
        console.warn('Map fitBounds error:', err);
      }
      const t = setTimeout(() => {
        map.invalidateSize();
      }, 250);
      return () => clearTimeout(t);
    }
  }, [bounds, map]);
  return null;
};

const maneuverIcon = (type) => {
  const icons = {
    turn: '↪', 'new name': '→', arrive: '⬛', depart: '▶',
    merge: '⇌', 'on ramp': '↗', 'off ramp': '↙', fork: '⑂',
    roundabout: '↺', rotary: '↺', straight: '↑', default: '→',
  };
  return icons[type] || icons.default;
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="dark:bg-dark-highlight bg-light-highlight rounded-xl p-4 flex items-center gap-3">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <p className="text-xs dark:text-dark-muted text-light-muted">{label}</p>
      <p className="font-bold stat-number dark:text-dark-text text-light-text text-sm">{value}</p>
    </div>
  </div>
);

const TripDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNav, setShowNav] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    getTripById(id)
      .then(res => setTrip(res.data.data))
      .catch(() => toast.error('Trip not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this trip?')) return;
    setDeleting(true);
    try {
      await deleteTrip(id);
      toast.success('Trip deleted');
      navigate('/history');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><LoadingSpinner size="lg" text="Loading trip details..." /></div>;
  if (!trip) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <Route className="w-12 h-12 dark:text-dark-muted text-light-muted opacity-30" />
      <p className="dark:text-dark-muted text-light-muted">Trip not found</p>
      <button onClick={() => navigate('/history')} className="px-4 py-2 volt-btn rounded-xl text-sm">Back to History</button>
    </div>
  );

  const { summary, origin, destination, chargingStops = [], navSteps = [], vehicle } = trip;

  // Extract coordinates for the polyline
  let routeCoords = [];
  if (trip.routeGeometry?.coordinates?.length) {
    routeCoords = trip.routeGeometry.coordinates.map(([lng, lat]) => [lat, lng]);
  } else if (origin?.lat && destination?.lat) {
    routeCoords = [
      [origin.lat, origin.lng],
      ...chargingStops.map(s => [s.location.lat, s.location.lng]).filter(c => c[0]),
      [destination.lat, destination.lng],
    ];
  }

  // Calculate default center point
  const center = origin?.lat && destination?.lat
    ? [(origin.lat + destination.lat) / 2, (origin.lng + destination.lng) / 2]
    : [12.9716, 77.5946];

  // Bounding box points for auto-fit
  const boundsPoints = routeCoords.length > 0 ? routeCoords : (origin?.lat ? [[origin.lat, origin.lng]] : []);

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/history')} className="p-2 rounded-xl dark:hover:bg-dark-highlight hover:bg-light-highlight transition-colors" data-testid="back-btn">
            <ArrowLeft className="w-4 h-4 dark:text-dark-muted text-light-muted" />
          </button>
          <div>
            <h2 className="text-xl font-bold dark:text-dark-text text-light-text">Trip Details</h2>
            <p className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
              {new Date(trip.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => setIsNavigating(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-bg text-sm font-extrabold shadow-md hover:scale-105 transition-all"
            data-testid="start-journey-btn"
          >
            <Navigation className="w-4 h-4 fill-dark-bg" /> Start Journey
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-secondary/30 text-secondary text-sm font-medium hover:bg-secondary/5 transition-colors"
            data-testid="share-trip-btn"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button
            onClick={() => exportTripPDF(trip, vehicle)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
            data-testid="export-pdf-btn"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>
          <button
            onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-400/30 text-red-400 text-sm font-medium hover:bg-red-400/5 transition-colors disabled:opacity-50"
            data-testid="delete-trip-btn"
          >
            {deleting ? <LoadingSpinner size="sm" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>

      {/* Route Title */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border p-5"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400 flex-shrink-0" />
            <p className="font-semibold dark:text-dark-text text-light-text text-sm">{origin?.address?.split(',').slice(0, 2).join(',')}</p>
          </div>
          <div className="flex-1 h-px dark:bg-dark-border bg-light-border" />
          <Route className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 h-px dark:bg-dark-border bg-light-border" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400 flex-shrink-0" />
            <p className="font-semibold dark:text-dark-text text-light-text text-sm">{destination?.address?.split(',').slice(0, 2).join(',')}</p>
          </div>
        </div>
        {vehicle?.name && (
          <div className="flex items-center gap-1.5 mt-3">
            <Car className="w-3.5 h-3.5 dark:text-dark-muted text-light-muted" />
            <span className="text-xs dark:text-dark-muted text-light-muted">{vehicle.name}</span>
          </div>
        )}
      </motion.div>

      {/* Stats Row */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <StatCard icon={MapPin} label="Total Distance" value={formatDistance(summary?.totalDistanceKm)} color="bg-primary/10 text-primary" />
        <StatCard icon={Clock} label="Total Time" value={formatTime(summary?.totalTripTimeMin)} color="bg-secondary/10 text-secondary" />
        <StatCard icon={Zap} label="Charging Stops" value={`${summary?.numberOfChargingStops || 0} stops`} color="bg-emerald-400/10 text-emerald-400" />
        <StatCard icon={Route} label="Trip Cost" value={formatCost(summary?.totalCostInr ?? summary?.totalCostUsd)} color="bg-orange-400/10 text-orange-400" />
      </motion.div>

      {/* Interactive Map (React Leaflet + OpenStreetMap) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border overflow-hidden"
      >
        <div className="px-5 py-3 border-b dark:border-dark-border border-light-border flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary" />
            <h3 className="font-bold dark:text-dark-text text-light-text text-sm">Interactive Route Map</h3>
          </div>
          <div className="flex items-center gap-3 text-xs dark:text-dark-muted text-light-muted">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Start</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> End</span>
            {chargingStops.length > 0 && <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] inline-block" /> Charging Stops</span>}
          </div>
        </div>

        <div style={{ height: '380px' }} className="w-full relative" data-testid="trip-detail-map">
          <MapContainer center={center} zoom={7} className="w-full h-full" style={{ background: '#0B0E14' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
              maxZoom={19}
            />

            {boundsPoints.length > 0 && <MapAutoFit bounds={boundsPoints} />}

            {routeCoords.length > 0 && (
              <Polyline positions={routeCoords} color="#00F0FF" weight={4} opacity={0.9} />
            )}

            {/* Origin marker */}
            {origin?.lat && (
              <Marker position={[origin.lat, origin.lng]} icon={startIcon}>
                <Popup className="custom-popup">
                  <div className="text-xs">
                    <strong className="text-emerald-400 font-bold">Start Point</strong><br />
                    <span>{origin.address}</span>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Destination marker */}
            {destination?.lat && (
              <Marker position={[destination.lat, destination.lng]} icon={endIcon}>
                <Popup className="custom-popup">
                  <div className="text-xs">
                    <strong className="text-amber-400 font-bold">Destination</strong><br />
                    <span>{destination.address}</span>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Planned charging stops along route */}
            {chargingStops.map((stop, i) => {
              if (!stop.location?.lat) return null;
              const stopObj = {
                ...stop,
                name: stop.stationName,
                operator: stop.operatorName || stop.operator || 'Planned Charging Stop',
                latitude: stop.location.lat,
                longitude: stop.location.lng,
                chargingPowerKW: stop.chargingPowerKw || 50,
                source: 'Planned Route Station',
              };
              return (
                <Marker
                  key={`stop-${i}`}
                  position={[stop.location.lat, stop.location.lng]}
                  icon={chargingIcon}
                  eventHandlers={{
                    click: () => setSelectedStation(stopObj),
                  }}
                >
                  <Popup className="custom-popup">
                    <div className="text-xs p-1">
                      <strong className="text-primary font-bold text-sm">{stop.stationName}</strong><br />
                      <span className="opacity-75">Stop #{i + 1} · {stop.chargingPowerKw || 50} kW</span><br />
                      {stop.energyAddedKwh && <span>Added: +{stop.energyAddedKwh.toFixed(1)} kWh<br /></span>}
                      {stop.chargingTimeMin && <span>Time: {stop.chargingTimeMin.toFixed(0)} min<br /></span>}
                      <button
                        type="button"
                        onClick={() => setSelectedStation(stopObj)}
                        className="mt-2 w-full py-1.5 px-3 rounded-lg volt-btn text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                      >
                        <Zap className="w-3.5 h-3.5" /> Inspect Details (Google Maps)
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </motion.div>

      {/* Charging Stops */}
      {chargingStops.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border p-5"
        >
          <h3 className="font-bold dark:text-dark-text text-light-text text-sm mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-secondary" /> Charging Stops ({chargingStops.length})
          </h3>
          <div className="space-y-3">
            {chargingStops.map((stop, i) => (
              <div key={i} className="dark:bg-dark-highlight bg-light-highlight rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-semibold dark:text-dark-text text-light-text text-sm">{stop.stationName || `Charging Stop ${i + 1}`}</p>
                    <p className="text-xs dark:text-dark-muted text-light-muted">{stop.address || 'Along Route'}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs dark:text-dark-muted text-light-muted">
                      <span>{stop.chargingPowerKw} kW</span>
                      <span>·</span>
                      <span>{stop.arrivalSocPct?.toFixed(0)}% → {stop.departureSocPct?.toFixed(0)}% SoC</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold stat-number text-primary text-sm">+{stop.energyAddedKwh?.toFixed(1)} kWh</p>
                  <p className="text-xs dark:text-dark-muted text-light-muted">{stop.chargingTimeMin?.toFixed(0)} min · {formatCost(stop.costUsd)}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Turn-by-Turn Navigation */}
      {navSteps.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border overflow-hidden"
        >
          <button
            onClick={() => setShowNav(!showNav)}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-primary" />
              <span className="font-bold dark:text-dark-text text-light-text text-sm">Turn-by-Turn Navigation ({navSteps.length} steps)</span>
            </div>
            {showNav ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showNav && (
            <div className="px-5 pb-5 space-y-2 border-t dark:border-dark-border border-light-border pt-4 max-h-80 overflow-y-auto">
              {navSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-xs py-1.5 border-b dark:border-dark-border/50 border-light-border/50 last:border-0">
                  <span className="w-5 h-5 rounded-full dark:bg-dark-highlight bg-light-highlight text-primary flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
                    {maneuverIcon(step.type)}
                  </span>
                  <span className="dark:text-dark-text text-light-text flex-1">{step.instruction}</span>
                  {step.road && <span className="text-[10px] dark:text-dark-muted text-light-muted bg-primary/5 px-2 py-0.5 rounded">{step.road}</span>}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {showShare && (
        <ShareModal
          tripData={trip}
          vehicle={vehicle}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Google Maps Style Station Inspector Drawer */}
      {selectedStation && (
        <StationDetailDrawer
          station={selectedStation}
          vehicle={vehicle}
          onClose={() => setSelectedStation(null)}
        />
      )}

      {/* Live Navigation Overlay (Uber / Rapido Cockpit) */}
      {isNavigating && (
        <LiveNavigationOverlay
          tripData={trip}
          vehicle={vehicle}
          onClose={() => setIsNavigating(false)}
        />
      )}
    </div>
  );
};

export default TripDetailPage;
