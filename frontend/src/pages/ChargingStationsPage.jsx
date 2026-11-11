import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  MapPin, Search, Zap, Filter, Loader, ExternalLink, Copy, Check, 
  RotateCcw, Navigation, SlidersHorizontal, Info, X, ChevronRight,
  ShieldCheck, AlertCircle, RefreshCw
} from 'lucide-react';
import { getStationsByBbox, getNearbyStations } from '../services/authService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Marker icon generator with power-based color coding
const createStationIcon = (power, isSelected = false) => {
  let color = '#94A3B8'; // Unknown / unspecified
  let pulseGlow = 'rgba(148,163,184,0.4)';
  if (power >= 100) {
    color = '#00F0FF'; // Ultra-Fast
    pulseGlow = 'rgba(0,240,255,0.7)';
  } else if (power >= 50) {
    color = '#CCFF00'; // DC Fast
    pulseGlow = 'rgba(204,255,0,0.7)';
  } else if (power >= 22) {
    color = '#A78BFA'; // AC Fast
    pulseGlow = 'rgba(167,139,250,0.6)';
  } else if (power > 0) {
    color = '#38BDF8'; // Standard AC
    pulseGlow = 'rgba(56,189,248,0.5)';
  }

  const size = isSelected ? 32 : 26;
  const stroke = isSelected ? '#FFFFFF' : '#0B0E14';
  const strokeWidth = isSelected ? 3 : 2;

  return new L.DivIcon({
    html: `
      <div style="
        background:${color};
        width:${size}px;
        height:${size}px;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        border:${strokeWidth}px solid ${stroke};
        box-shadow:0 0 ${isSelected ? '12px' : '6px'} ${pulseGlow};
        transition: transform 0.2s ease;
        ${isSelected ? 'transform: scale(1.15);' : ''}
      ">
        <svg width="${size * 0.55}" height="${size * 0.55}" viewBox="0 0 24 24" fill="#0B0E14">
          <path d="M13 2L4.5 13.5H11L11 22 19.5 10.5H13L13 2Z"/>
        </svg>
      </div>`,
    className: 'osm-charging-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Component to handle map move events and expose map instance
const MapController = ({ onBoundsChange, autoRefresh }) => {
  const map = useMap();
  const debounceTimer = useRef(null);

  useMapEvents({
    moveend: () => {
      if (autoRefresh) {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          const bounds = map.getBounds();
          onBoundsChange({
            south: bounds.getSouth(),
            west: bounds.getWest(),
            north: bounds.getNorth(),
            east: bounds.getEast(),
            zoom: map.getZoom(),
          });
        }, 800); // 800ms debounce
      }
    },
  });

  return null;
};

// Helper component to pan map to coordinates
const FlyToLocation = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center.lat && center.lng) {
      map.flyTo([center.lat, center.lng], map.getZoom() < 12 ? 13 : map.getZoom(), {
        duration: 1.2,
      });
    }
  }, [center, map]);
  return null;
};

const ChargingStationsPage = () => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchLocation, setSearchLocation] = useState('');
  const [mapCenter, setMapCenter] = useState({ lat: 28.6139, lng: 77.2090 }); // Default Delhi
  const [selectedStation, setSelectedStation] = useState(null);
  const [copiedCoord, setCopiedCoord] = useState(false);
  const [showRawTags, setShowRawTags] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(12);
  const [showFilters, setShowFilters] = useState(false);

  // Filter States
  const [filterConnector, setFilterConnector] = useState('all');
  const [filterMinPower, setFilterMinPower] = useState('all');
  const [filterOperator, setFilterOperator] = useState('all');
  const [filterAccess, setFilterAccess] = useState('all');
  const [filterKnownSpecsOnly, setFilterKnownSpecsOnly] = useState(false);

  // Keep reference to latest bounds for manual "Search this area"
  const mapBoundsRef = useRef(null);

  // Fetch stations for given bounding box
  const fetchBboxStations = useCallback(async (bbox) => {
    mapBoundsRef.current = bbox;
    setCurrentZoom(bbox.zoom || 12);

    if (bbox.zoom !== undefined && bbox.zoom < 10) {
      toast('Map area is large. Zoom in closer for fastest OpenStreetMap response.', { icon: '🔍' });
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getStationsByBbox({
        south: bbox.south,
        west: bbox.west,
        north: bbox.north,
        east: bbox.east,
      });

      const data = res.data?.data || [];
      setStations(data);

      if (data.length === 0) {
        toast('No OpenStreetMap charging stations mapped in this visible area', { icon: 'ℹ️' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch charging stations';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial user location or default search
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setMapCenter({ lat: latitude, lng: longitude });
          // Fetch initial 10km radius around user
          fetchRadius(latitude, longitude);
        },
        () => fetchRadius(28.6139, 77.2090)
      );
    } else {
      fetchRadius(28.6139, 77.2090);
    }
  }, []);

  const fetchRadius = async (lat, lng) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getNearbyStations({ lat, lng, distance: 15, maxResults: 50 });
      setStations(res.data?.data || []);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to query charging stations');
    } finally {
      setLoading(false);
    }
  };

  // Search location via Nominatim OpenStreetMap Geocoder
  const handleSearchLocation = async () => {
    if (!searchLocation.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchLocation)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'EcoRouteAI/1.0 (ev-route-planner)' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setMapCenter({ lat, lng: lon });
        fetchRadius(lat, lon);
      } else {
        toast.error('Location not found in OpenStreetMap');
      }
    } catch {
      toast.error('Location search failed');
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on current viewport
  const handleSearchThisArea = () => {
    if (mapBoundsRef.current) {
      fetchBboxStations(mapBoundsRef.current);
    } else {
      fetchRadius(mapCenter.lat, mapCenter.lng);
    }
  };

  // Copy coordinates to clipboard
  const handleCopyCoords = (lat, lng) => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopiedCoord(true);
    toast.success('Coordinates copied!');
    setTimeout(() => setCopiedCoord(false), 2000);
  };

  // Dynamic list of unique operators in currently loaded stations
  const availableOperators = useMemo(() => {
    const set = new Set();
    stations.forEach(s => {
      if (s.operator && s.operator !== 'null') set.add(s.operator);
    });
    return Array.from(set).sort();
  }, [stations]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterConnector !== 'all') count++;
    if (filterMinPower !== 'all') count++;
    if (filterOperator !== 'all') count++;
    if (filterAccess !== 'all') count++;
    if (filterKnownSpecsOnly) count++;
    return count;
  }, [filterConnector, filterMinPower, filterOperator, filterAccess, filterKnownSpecsOnly]);

  const resetFilters = () => {
    setFilterConnector('all');
    setFilterMinPower('all');
    setFilterOperator('all');
    setFilterAccess('all');
    setFilterKnownSpecsOnly(false);
  };

  // Filter stations based on criteria
  const filteredStations = useMemo(() => {
    return stations.filter(station => {
      // Known specs toggle
      if (filterKnownSpecsOnly) {
        const hasPower = station.chargingPowerKW !== null && station.chargingPowerKW > 0;
        const hasConnectors = station.connectors && station.connectors.length > 0;
        if (!hasPower && !hasConnectors) return false;
      }

      // Connector filter
      if (filterConnector !== 'all') {
        const connectors = station.connectors || [];
        const hasMatch = connectors.some(c => c.type.toLowerCase().includes(filterConnector.toLowerCase()));
        if (!hasMatch) return false;
      }

      // Minimum power filter
      if (filterMinPower !== 'all') {
        const min = parseFloat(filterMinPower);
        const power = station.chargingPowerKW || 0;
        if (power < min) return false;
      }

      // Operator filter
      if (filterOperator !== 'all') {
        if (!station.operator || station.operator !== filterOperator) return false;
      }

      // Access filter
      if (filterAccess !== 'all') {
        const access = (station.access || '').toLowerCase();
        if (filterAccess === 'public' && !access.includes('yes') && !access.includes('public')) return false;
        if (filterAccess === 'customers' && !access.includes('customers')) return false;
        if (filterAccess === 'private' && !access.includes('private') && !access.includes('permissive')) return false;
      }

      return true;
    });
  }, [stations, filterConnector, filterMinPower, filterOperator, filterAccess, filterKnownSpecsOnly]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 sm:p-6 gap-4 overflow-hidden dark:bg-dark-bg bg-light-bg">
      {/* Top Controls Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold dark:text-dark-text text-light-text font-display">
              Charging Stations
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/20">
              OpenStreetMap
            </span>
          </div>
          <p className="text-xs sm:text-sm dark:text-dark-muted text-light-muted mt-0.5">
            Discover verified EV charging points via Overpass API • No API key required
          </p>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Location Search Input */}
          <div className="flex items-center gap-1">
            <div className="relative">
              <input
                type="text"
                value={searchLocation}
                onChange={e => setSearchLocation(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchLocation()}
                placeholder="Search city or area..."
                className="pl-8 pr-3 py-2 rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-surface bg-white dark:text-dark-text text-light-text text-xs sm:text-sm focus:outline-none focus:border-primary w-44 sm:w-56"
                data-testid="station-search-input"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 dark:text-dark-muted text-light-muted" />
            </div>
            <button
              onClick={handleSearchLocation}
              disabled={loading}
              className="px-3 py-2 volt-btn rounded-xl text-xs font-semibold flex items-center gap-1.5"
              data-testid="station-search-btn"
            >
              {loading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <span>Find</span>}
            </button>
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-primary/15 border-primary/40 text-primary'
                : 'dark:border-dark-border border-light-border dark:bg-dark-surface bg-white dark:text-dark-text text-light-text'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-dark-bg font-bold text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </motion.div>

      {/* Expandable Filter Drawer */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-2xl border dark:border-dark-border border-light-border dark:bg-dark-surface bg-white overflow-hidden shadow-lg flex-shrink-0"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider dark:text-dark-text text-light-text flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-primary" /> Filter OpenStreetMap Results
              </span>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset all ({activeFilterCount})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Connector Type */}
              <div>
                <label className="block text-[11px] font-medium dark:text-dark-muted text-light-muted mb-1">
                  Connector Type
                </label>
                <select
                  value={filterConnector}
                  onChange={e => setFilterConnector(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-highlight bg-light-highlight dark:text-dark-text text-light-text text-xs"
                >
                  <option value="all">All Connectors</option>
                  <option value="ccs">CCS 2 (Combo)</option>
                  <option value="type 2">Type 2 (AC)</option>
                  <option value="chademo">CHAdeMO</option>
                  <option value="tesla">Tesla Supercharger</option>
                  <option value="schuko">Schuko / Standard Plug</option>
                </select>
              </div>

              {/* Minimum Power */}
              <div>
                <label className="block text-[11px] font-medium dark:text-dark-muted text-light-muted mb-1">
                  Minimum Power
                </label>
                <select
                  value={filterMinPower}
                  onChange={e => setFilterMinPower(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-highlight bg-light-highlight dark:text-dark-text text-light-text text-xs"
                >
                  <option value="all">Any Power</option>
                  <option value="22">≥ 22 kW (Fast AC)</option>
                  <option value="50">≥ 50 kW (DC Fast)</option>
                  <option value="100">≥ 100 kW (Ultra-Fast)</option>
                  <option value="150">≥ 150 kW (Hyper-Fast)</option>
                </select>
              </div>

              {/* Operator */}
              <div>
                <label className="block text-[11px] font-medium dark:text-dark-muted text-light-muted mb-1">
                  Operator
                </label>
                <select
                  value={filterOperator}
                  onChange={e => setFilterOperator(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-highlight bg-light-highlight dark:text-dark-text text-light-text text-xs"
                >
                  <option value="all">All Operators ({availableOperators.length})</option>
                  {availableOperators.map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>

              {/* Access Policy */}
              <div>
                <label className="block text-[11px] font-medium dark:text-dark-muted text-light-muted mb-1">
                  Access Type
                </label>
                <select
                  value={filterAccess}
                  onChange={e => setFilterAccess(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-highlight bg-light-highlight dark:text-dark-text text-light-text text-xs"
                >
                  <option value="all">All Access</option>
                  <option value="public">Public Access</option>
                  <option value="customers">Customers Only</option>
                  <option value="private">Private / Restricted</option>
                </select>
              </div>
            </div>

            {/* Checkbox toggle */}
            <div className="mt-3 pt-2.5 border-t dark:border-dark-border/60 border-light-border flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 cursor-pointer dark:text-dark-muted text-light-muted">
                <input
                  type="checkbox"
                  checked={filterKnownSpecsOnly}
                  onChange={e => setFilterKnownSpecsOnly(e.target.checked)}
                  className="rounded text-primary focus:ring-0"
                />
                <span>Only show stations with known power/connectors (hide incomplete metadata)</span>
              </label>

              <span className="dark:text-dark-muted text-light-muted text-[11px]">
                Showing <strong>{filteredStations.length}</strong> of {stations.length} stations
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Map (Left/Center) + Station List/Details (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Interactive Map View */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden border dark:border-dark-border border-light-border relative flex flex-col">
          {/* Floating Map Controls */}
          <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
            <button
              onClick={handleSearchThisArea}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-dark-bg/85 backdrop-blur-md text-primary border border-primary/40 shadow-xl flex items-center gap-1.5 hover:bg-dark-bg hover:border-primary transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Search This Area</span>
            </button>

            {/* Auto refresh toggle */}
            <label className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-dark-bg/85 backdrop-blur-md dark:text-dark-text text-white border dark:border-dark-border border-dark-border/80 shadow-xl cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                className="rounded text-primary focus:ring-0"
              />
              <span>Auto-refresh on move</span>
            </label>
          </div>

          {/* Map Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-dark-bg/40 backdrop-blur-[2px] z-[999] flex items-center justify-center pointer-events-none">
              <div className="bg-dark-surface/90 border border-primary/30 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-2.5">
                <Loader className="w-4 h-4 text-primary animate-spin" />
                <span className="text-xs font-medium text-dark-text">Querying OpenStreetMap Overpass API...</span>
              </div>
            </div>
          )}

          {/* Leaflet Map Container with required OSM Attribution */}
          <MapContainer
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={12}
            className="w-full h-full flex-1"
            style={{ background: '#0B0E14', minHeight: '350px' }}
          >
            {/* Standard OpenStreetMap TileLayer with verified copyright attribution */}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
              maxZoom={19}
            />

            <MapController
              autoRefresh={autoRefresh}
              onBoundsChange={fetchBboxStations}
            />

            <FlyToLocation center={mapCenter} />

            {/* Render Charging Station Markers */}
            {filteredStations.map(station => {
              const isSelected = selectedStation?.id === station.id;
              const power = station.chargingPowerKW || 0;

              return (
                <Marker
                  key={station.id}
                  position={[station.latitude, station.longitude]}
                  icon={createStationIcon(power, isSelected)}
                  eventHandlers={{
                    click: () => setSelectedStation(station),
                  }}
                >
                  <Popup className="custom-popup" closeButton={false}>
                    <div className="text-xs min-w-[190px] p-1 font-sans">
                      <div className="flex items-center gap-1.5 mb-1 text-primary font-bold">
                        <Zap className="w-3.5 h-3.5" />
                        <span>{station.name}</span>
                      </div>
                      <p className="text-[11px] opacity-75 mb-2 line-clamp-2">
                        {station.operator || 'Operator: Not available'}
                      </p>
                      <div className="space-y-1 text-[11px] border-t pt-1 border-white/10">
                        <p><span className="opacity-60">Power:</span> <strong>{station.chargingPowerKW ? `${station.chargingPowerKW} kW` : 'Not specified'}</strong></p>
                        <p><span className="opacity-60">Connectors:</span> {station.connectors?.length ? station.connectors.map(c => c.type).join(', ') : 'Not specified'}</p>
                        <p><span className="opacity-60">OSM:</span> #{station.osmId} ({station.elementType})</p>
                      </div>
                      <button
                        onClick={() => setSelectedStation(station)}
                        className="mt-2 w-full py-1 text-center bg-primary/20 text-primary rounded font-semibold text-[10px] hover:bg-primary/30 transition-colors"
                      >
                        View Full Details
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Right Panel: Selected Station Details or Station List */}
        <div className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border overflow-hidden flex flex-col h-full">
          {selectedStation ? (
            /* Station Detail View */
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b dark:border-dark-border border-light-border flex items-center justify-between flex-shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Station Details
                </span>
                <button
                  onClick={() => setSelectedStation(null)}
                  className="p-1 rounded-lg dark:hover:bg-dark-highlight hover:bg-light-highlight text-dark-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Title & Operator */}
                <div>
                  <h2 className="text-base font-bold dark:text-dark-text text-light-text">
                    {selectedStation.name}
                  </h2>
                  <p className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
                    Operator: <strong className="dark:text-dark-text text-light-text">{selectedStation.operator || 'Not available'}</strong>
                  </p>
                </div>

                {/* Live Availability Disclaimer */}
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Live Availability: Unknown</span>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      OpenStreetMap records physical infrastructure, not live charger occupancy.
                    </p>
                  </div>
                </div>

                {/* Technical Specifications */}
                <div className="p-3.5 rounded-xl dark:bg-dark-highlight/50 bg-light-highlight/60 border dark:border-dark-border/60 border-light-border space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider dark:text-dark-muted text-light-muted block">
                    Technical Specifications
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[11px] opacity-60 block">Max Charging Power</span>
                      <strong className="text-primary text-sm font-bold">
                        {selectedStation.chargingPowerKW ? `${selectedStation.chargingPowerKW} kW` : 'Not available'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[11px] opacity-60 block">Charging Points</span>
                      <strong className="text-sm font-bold">
                        {selectedStation.socketCount ? `${selectedStation.socketCount} point(s)` : 'Not available'}
                      </strong>
                    </div>
                  </div>

                  {/* Connectors */}
                  <div className="pt-2 border-t dark:border-dark-border/60 border-light-border">
                    <span className="text-[11px] opacity-60 block mb-1">Mapped Connectors:</span>
                    {selectedStation.connectors && selectedStation.connectors.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedStation.connectors.map((c, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium">
                            {c.type} {c.outputKW ? `(${c.outputKW} kW)` : ''}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-dark-muted italic">Connector types not recorded in OSM</span>
                    )}
                  </div>
                </div>

                {/* Access & Hours */}
                <div className="space-y-1.5 text-xs dark:text-dark-muted text-light-muted">
                  <div className="flex justify-between py-1 border-b dark:border-dark-border/40 border-light-border">
                    <span>Access Policy:</span>
                    <strong className="dark:text-dark-text text-light-text capitalize">{selectedStation.access || 'Not available'}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b dark:border-dark-border/40 border-light-border">
                    <span>Usage Fee:</span>
                    <strong className="dark:text-dark-text text-light-text capitalize">{selectedStation.fee || 'Not available'}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b dark:border-dark-border/40 border-light-border">
                    <span>Opening Hours:</span>
                    <strong className="dark:text-dark-text text-light-text">{selectedStation.openingHours || 'Not available'}</strong>
                  </div>
                </div>

                {/* Coordinates & Copy */}
                <div className="flex items-center justify-between p-2.5 rounded-xl border dark:border-dark-border border-light-border text-xs">
                  <div className="font-mono text-[11px]">
                    {selectedStation.latitude}, {selectedStation.longitude}
                  </div>
                  <button
                    onClick={() => handleCopyCoords(selectedStation.latitude, selectedStation.longitude)}
                    className="p-1 rounded hover:bg-primary/10 text-primary transition-colors flex items-center gap-1 text-[11px]"
                  >
                    {copiedCoord ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCoord ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Action Navigation Buttons */}
                <div className="space-y-2 pt-1">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedStation.latitude},${selectedStation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 volt-btn rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Get Directions (Google Maps)</span>
                  </a>

                  <a
                    href={selectedStation.osmUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 rounded-xl text-xs font-medium border dark:border-dark-border border-light-border hover:bg-light-highlight dark:hover:bg-dark-highlight text-center flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View on OpenStreetMap ({selectedStation.elementType} #{selectedStation.osmId})</span>
                  </a>
                </div>

                {/* Raw OSM Tags Accordion */}
                <div className="pt-2">
                  <button
                    onClick={() => setShowRawTags(!showRawTags)}
                    className="text-[11px] text-dark-muted hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <Info className="w-3 h-3" />
                    <span>{showRawTags ? 'Hide Raw OSM Tags' : 'Inspect Raw OpenStreetMap Tags'}</span>
                  </button>

                  {showRawTags && (
                    <div className="mt-2 p-2.5 rounded-lg bg-dark-bg text-[10px] font-mono text-dark-muted max-h-40 overflow-y-auto">
                      <pre>{JSON.stringify(selectedStation.rawTags, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Station List View */
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b dark:border-dark-border border-light-border flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="font-bold dark:text-dark-text text-light-text text-sm">
                    Mapped Stations ({filteredStations.length})
                  </h3>
                  <p className="text-[11px] dark:text-dark-muted text-light-muted">
                    Click any marker or station below for details
                  </p>
                </div>

                <button
                  onClick={handleSearchThisArea}
                  disabled={loading}
                  title="Refresh search"
                  className="p-1.5 rounded-lg dark:hover:bg-dark-highlight hover:bg-light-highlight text-dark-muted transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y dark:divide-dark-border divide-light-border">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <LoadingSpinner text="Searching Overpass API..." />
                    <span className="text-[11px] dark:text-dark-muted text-light-muted">
                      Querying OpenStreetMap charging nodes & ways
                    </span>
                  </div>
                ) : errorMsg ? (
                  <div className="text-center py-12 px-4 space-y-3">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                    <p className="text-xs text-red-400">{errorMsg}</p>
                    <button
                      onClick={handleSearchThisArea}
                      className="px-3 py-1.5 volt-btn rounded-xl text-xs font-semibold"
                    >
                      Retry Query
                    </button>
                  </div>
                ) : filteredStations.length === 0 ? (
                  <div className="text-center py-16 px-4 space-y-2">
                    <MapPin className="w-10 h-10 dark:text-dark-muted text-light-muted mx-auto opacity-40" />
                    <p className="text-sm font-semibold dark:text-dark-text text-light-text">
                      No charging stations found
                    </p>
                    <p className="text-xs dark:text-dark-muted text-light-muted max-w-xs mx-auto">
                      Pan or zoom the map to another area and click "Search This Area", or try searching for a major city.
                    </p>
                  </div>
                ) : (
                  filteredStations.map(station => {
                    const isSelected = selectedStation?.id === station.id;
                    const power = station.chargingPowerKW;

                    return (
                      <div
                        key={station.id}
                        onClick={() => {
                          setSelectedStation(station);
                          setMapCenter({ lat: station.latitude, lng: station.longitude });
                        }}
                        className={`p-3.5 cursor-pointer transition-colors hover:dark:bg-dark-highlight hover:bg-light-highlight ${
                          isSelected ? 'dark:bg-dark-highlight bg-light-highlight border-l-2 border-primary' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold dark:text-dark-text text-light-text truncate">
                              {station.name}
                            </h4>
                            <p className="text-[11px] dark:text-dark-muted text-light-muted truncate mt-0.5">
                              {station.operator || 'Operator: Not available'}
                            </p>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              {power ? `${power} kW` : 'kW ?'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-[11px] dark:text-dark-muted text-light-muted">
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-primary" />
                            {station.connectors?.length ? `${station.connectors.length} connector type(s)` : 'Connectors: ?'}
                          </span>
                          <span className="opacity-40">•</span>
                          <span>#{station.osmId}</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChargingStationsPage;
