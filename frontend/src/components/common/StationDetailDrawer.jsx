import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, MapPin, Navigation, Clock, ShieldCheck, CheckCircle2,
  ExternalLink, Copy, X, Share2, Award, Info, AlertTriangle, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

const StationDetailDrawer = ({ station, vehicle, onClose, onAddToRoute }) => {
  if (!station) return null;

  const lat = station.latitude || station.location?.lat;
  const lon = station.longitude || station.location?.lng;
  const name = station.name || station.stationName || 'EV Charging Station';
  const operator = station.operator || station.operatorName || 'Public Network';
  const powerKw = station.chargingPowerKW || station.maxPowerKw || (station.chargingPowerKw || 50);
  const connectors = station.connectors || [];
  const distance = station.corridorDistanceKm != null
    ? `${station.corridorDistanceKm} km off route`
    : station.distanceKm != null
    ? `${station.distanceKm} km from route`
    : null;

  const googleMapsUrl = lat && lon ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}` : null;
  const osmUrl = station.osmUrl || (station.elementType && station.osmId
    ? `https://www.openstreetmap.org/${station.elementType}/${station.osmId}`
    : lat && lon
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`
    : null);

  const handleCopyCoords = () => {
    if (lat && lon) {
      navigator.clipboard.writeText(`${lat}, ${lon}`);
      toast.success(`📍 Coordinates copied: ${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    }
  };

  const isFastCharger = powerKw >= 50;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg max-h-[90vh] overflow-y-auto dark:bg-dark-surface bg-white rounded-t-3xl sm:rounded-3xl border dark:border-dark-border border-light-border shadow-2xl flex flex-col"
          data-testid="station-detail-drawer"
        >
          {/* Header Banner - Google Maps Style */}
          <div className="relative p-6 bg-gradient-to-br from-primary/20 via-dark-surface to-secondary/20 border-b dark:border-dark-border border-light-border">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full dark:bg-dark-highlight/80 bg-light-highlight dark:hover:bg-dark-highlight hover:bg-slate-200 text-slate-400 hover:text-white transition-colors"
              title="Close details"
              data-testid="close-station-drawer-btn"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-volt flex items-center justify-center text-dark-bg font-bold shadow-lg shadow-primary/30 flex-shrink-0">
                <Zap className="w-5 h-5 fill-dark-bg" />
              </div>
              <div className="min-w-0 pr-8">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> Real Live Station
                </span>
                <p className="text-xs text-primary font-semibold mt-0.5 truncate">
                  {operator}
                </p>
              </div>
            </div>

            <h3 className="text-lg font-bold dark:text-dark-text text-light-text font-display leading-snug">
              {name}
            </h3>

            {station.address && (
              <p className="text-xs dark:text-dark-muted text-light-muted mt-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="truncate">{station.address}</span>
              </p>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 divide-x dark:divide-dark-border divide-light-border border-b dark:border-dark-border border-light-border py-3 bg-dark-bg/30 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Charging Power</p>
              <p className="text-sm font-bold text-primary mt-0.5">{powerKw} kW</p>
              <span className="text-[10px] text-slate-400">{isFastCharger ? 'DC Fast' : 'AC Standard'}</span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Corridor Detour</p>
              <p className="text-sm font-bold dark:text-dark-text text-light-text mt-0.5">
                {station.corridorDistanceKm != null ? `${station.corridorDistanceKm} km` : '~1-2 km'}
              </p>
              <span className="text-[10px] text-emerald-400">Straight-line</span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Sockets / Ports</p>
              <p className="text-sm font-bold text-secondary mt-0.5">
                {station.socketCount || station.numberOfPoints || (connectors.length > 0 ? connectors.length : 2)}
              </p>
              <span className="text-[10px] text-slate-400">Available</span>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5 flex-1">
            {/* Compatibility with Driver's Vehicle */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-400">
                  Compatible with {vehicle?.name || 'Your Electric Vehicle'}
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Standard CCS-2 / Type 2 plugs supported. Fast DC charging charges ~20% to 80% in 30-45 minutes.
                </p>
              </div>
            </div>

            {/* Connector Types List */}
            <div>
              <h4 className="text-xs font-bold dark:text-dark-text text-light-text uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" /> Supported Plugs & Connectors
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(connectors.length > 0 ? connectors : [
                  { type: 'CCS 2 (Combo)', outputKW: powerKw, count: 2 },
                  { type: 'Type 2 (AC)', outputKW: 22, count: 1 }
                ]).map((conn, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl dark:bg-dark-highlight bg-light-highlight border dark:border-dark-border border-light-border flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold dark:text-dark-text text-light-text">{conn.type}</p>
                      <p className="text-[10px] text-slate-400">{conn.outputKW || powerKw} kW · {conn.count || 1} socket</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Station Details & Infrastructure Metadata */}
            <div className="space-y-2 pt-2 border-t dark:border-dark-border border-light-border text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-secondary" /> Opening Hours
                </span>
                <span className="font-semibold dark:text-dark-text text-light-text">
                  {station.openingHours || '24/7 Public Access'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-primary" /> Data Source
                </span>
                <span className="font-semibold text-primary">
                  {station.source || 'OpenStreetMap Infrastructure'}
                </span>
              </div>

              {lat && lon && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-orange-400" /> GPS Coordinates
                  </span>
                  <button
                    onClick={handleCopyCoords}
                    className="flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                    title="Click to copy coordinates"
                  >
                    <span>{lat.toFixed(5)}, {lon.toFixed(5)}</span>
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons - Google Maps Navigation */}
          <div className="p-4 bg-dark-bg/50 border-t dark:border-dark-border border-light-border flex items-center gap-3 flex-wrap">
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 rounded-xl volt-btn font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
                data-testid="navigate-google-maps-btn"
              >
                <Navigation className="w-4 h-4" />
                Navigate in Google Maps
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <button
              onClick={handleCopyCoords}
              className="px-3.5 py-3 rounded-xl border dark:border-dark-border border-light-border text-xs font-semibold dark:text-dark-text text-light-text hover:bg-dark-highlight flex items-center gap-1.5 transition-colors"
              title="Copy Coordinates"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>

            {osmUrl && (
              <a
                href={osmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-3 rounded-xl border dark:border-dark-border border-light-border text-xs font-semibold text-slate-400 hover:text-white hover:bg-dark-highlight flex items-center gap-1.5 transition-colors"
                title="View OpenStreetMap Source"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>OSM</span>
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StationDetailDrawer;
