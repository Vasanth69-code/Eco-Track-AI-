import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Navigation, Volume2, VolumeX, Play, Pause, FastForward,
  RotateCcw, Compass, MapPin, Battery, Zap, Clock, Route,
  X, Crosshair, Award, AlertTriangle, CheckCircle2, Layers,
  Car, ShieldCheck, ChevronRight, LocateFixed, Eye, Sliders, Radio,
  ShieldAlert, Gauge, TrendingDown, Cpu, Bluetooth, Sparkles, AlertOctagon
} from 'lucide-react';
import StationDetailDrawer from '../common/StationDetailDrawer';
import { useTelemetry } from '../../context/TelemetryContext';
import toast from 'react-hot-toast';


// Helper: Calculate bearing angle between two coordinates
const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const toRad = deg => (deg * Math.PI) / 180;
  const toDeg = rad => (rad * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

// Helper: Haversine distance in km
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Map auto-follower component
const LiveMapController = ({ position, isFollowing, zoom = 16 }) => {
  const map = useMap();
  useEffect(() => {
    if (position && isFollowing) {
      map.setView(position, map.getZoom() || zoom, { animate: true, duration: 0.6 });
    }
  }, [position, isFollowing, map, zoom]);

  return null;
};

// Custom car navigation icon (Uber / Rapido / Google Maps style)
const createCarIcon = (bearing, isMoving) => new L.DivIcon({
  html: `
    <div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;">
      ${isMoving ? '<div style="position:absolute;width:48px;height:48px;border-radius:50%;background:rgba(0,240,255,0.25);animation:pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>' : ''}
      <div style="transform:rotate(${bearing}deg);transition:transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);width:42px;height:42px;border-radius:50%;background:#0B0E14;border:3px solid ${isMoving ? '#00F0FF' : '#10B981'};box-shadow:0 0 16px ${isMoving ? 'rgba(0,240,255,0.8)' : 'rgba(16,185,129,0.5)'};display:flex;align-items:center;justify-content:center;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L19 21L12 17L5 21L12 2Z" fill="${isMoving ? '#00F0FF' : '#10B981'}" stroke="#0B0E14" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  `,
  className: '',
  iconSize: [52, 52],
  iconAnchor: [26, 26],
});

// Custom station icon
const navStationIcon = new L.DivIcon({
  html: `
    <div style="background:#10B981;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #0B0E14;box-shadow:0 0 10px rgba(16,185,129,0.9)">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#0B0E14"><path d="M13 2L4.5 13.5H11L11 22 19.5 10.5H13L13 2Z"/></svg>
    </div>
  `,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const LiveNavigationOverlay = ({ tripData, vehicle, onClose }) => {
  if (!tripData) return null;

  const {
    origin, destination, routeGeometry, navSteps = [],
    chargingStops = [], stationsAlongRoute = [], summary,
    survivalConfidence = { normalConfidencePct: 96, adverseConfidencePct: 78, backupChargerRecommended: false },
    failureAwareRouting = null,
    selfCorrectingIntelligence = null,
  } = tripData;

  const { telemetry, updateTelemetry, connectionType, setIsModalOpen: openObdModal } = useTelemetry();

  // Extract route coordinates [[lat, lng], ...]
  const fullCoordinates = useMemo(() => {
    return routeGeometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || [];
  }, [routeGeometry]);

  const totalTripKm = summary?.totalDistanceKm || 100;
  const initialSoc = summary?.initialSocPct || vehicle?.usableBatteryPct || 90;
  const batteryCap = vehicle?.batteryCapacityKwh || 50;
  const efficiency = vehicle?.efficiencyKwhPer100km || 15;
  const minReservePct = vehicle?.minReserveSocPct || 15;

  // Navigation State
  // Default mode: Real GPS. Starts stationary (0 km/h) - does NOT auto-run like a video!
  const [navMode, setNavMode] = useState('gps'); // 'gps' | 'manual'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(true);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [isDrivingManual, setIsDrivingManual] = useState(false); // for manual mode
  const [manualThrottleKmh, setManualThrottleKmh] = useState(60);
  const [isCompleted, setIsCompleted] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('initializing'); // 'initializing' | 'active' | 'searching'
  const [isDetouredToBackup, setIsDetouredToBackup] = useState(false);
  const [showHudDetails, setShowHudDetails] = useState(false);

  const lastGpsCoordRef = useRef(null);
  const lastGpsTimeRef = useRef(Date.now());
  const lastSpokenStepIndexRef = useRef(-1);
  const watchIdRef = useRef(null);
  const manualTimerRef = useRef(null);

  // Current vehicle coordinate
  const currentCoord = fullCoordinates[currentIndex] || fullCoordinates[0] || [origin?.lat || 0, origin?.lng || 0];

  // Calculate distance traveled and remaining
  const progressRatio = fullCoordinates.length > 1 ? currentIndex / (fullCoordinates.length - 1) : 0;
  const distanceTraveledKm = parseFloat((totalTripKm * progressRatio).toFixed(1));
  const remainingDistanceKm = parseFloat(Math.max(0, totalTripKm - distanceTraveledKm).toFixed(1));

  // Self-Correcting Energy Intelligence
  const basePredictedRate = selfCorrectingIntelligence?.baselineEfficiencyKwhPer100km || efficiency;
  const livePowerKw = isMoving
    ? parseFloat(((currentSpeedKmh / 100) * 14 + (currentSpeedKmh > 75 ? 5.5 : 0) + (telemetry.hvacDrawKw || 1.1)).toFixed(1))
    : 0.6;
  const liveConsumptionRate = isMoving && currentSpeedKmh > 5
    ? parseFloat(((livePowerKw / currentSpeedKmh) * 100).toFixed(1))
    : basePredictedRate;
  const consumptionDriftPct = parseFloat((((liveConsumptionRate - basePredictedRate) / basePredictedRate) * 100).toFixed(0));
  const isUnexpectedDrain = isMoving && consumptionDriftPct > 10;

  // Dynamic Battery SoC calculation
  const energyUsedKwh = (distanceTraveledKm / 100) * (isUnexpectedDrain ? liveConsumptionRate : efficiency);
  const currentSoc = Math.max(5, parseFloat((initialSoc - (energyUsedKwh / batteryCap) * 100).toFixed(1)));
  const remainingRangeKm = Math.round((currentSoc / 100) * (batteryCap / (efficiency / 100)));

  // Projected destination SoC with self-correction
  const remainingEnergyNeededKwh = (remainingDistanceKm / 100) * Math.max(basePredictedRate, liveConsumptionRate);
  const projectedArrivalSoc = Math.max(1, parseFloat((currentSoc - (remainingEnergyNeededKwh / batteryCap) * 100).toFixed(1)));
  const isReserveAtRisk = projectedArrivalSoc < minReservePct;

  // Dynamic Battery Survival Confidence Score
  const baseConfidence = survivalConfidence?.normalConfidencePct || 96;
  const liveSurvivalScore = isUnexpectedDrain
    ? Math.max(48, Math.round(baseConfidence - consumptionDriftPct * 0.9))
    : isReserveAtRisk
      ? Math.max(52, baseConfidence - 24)
      : baseConfidence;

  // Backup charger from failure-aware routing
  const backupCharger = failureAwareRouting?.backupCharger || stationsAlongRoute[0] || null;

  // Sync telemetry state with navigation movement
  useEffect(() => {
    updateTelemetry({
      speedKmh: currentSpeedKmh,
      instantPowerKw: livePowerKw,
      socPct: currentSoc,
      gearState: isMoving ? 'D' : 'P',
    });
  }, [currentSpeedKmh, livePowerKw, currentSoc, isMoving]);

  // Remaining ETA based on current speed or average speed
  const effectiveSpeed = currentSpeedKmh > 10 ? currentSpeedKmh : 55;
  const remainingMinutes = Math.round((remainingDistanceKm / effectiveSpeed) * 60);


  // Split polyline into traveled (gray) and remaining (cyan)
  const traveledPath = useMemo(() => fullCoordinates.slice(0, currentIndex + 1), [fullCoordinates, currentIndex]);
  const remainingPath = useMemo(() => fullCoordinates.slice(currentIndex), [fullCoordinates, currentIndex]);

  // Find upcoming navigation step
  const currentStep = useMemo(() => {
    if (!navSteps || navSteps.length === 0) {
      return {
        instruction: `Head towards ${destination?.address?.split(',')[0] || 'destination'}`,
        road: destination?.address || '',
        distanceKm: remainingDistanceKm,
        type: 'straight',
        modifier: '',
      };
    }

    for (let i = 0; i < navSteps.length; i++) {
      const step = navSteps[i];
      if (step.location) {
        const dist = haversineKm(currentCoord[0], currentCoord[1], step.location.lat, step.location.lng);
        if (dist > 0.08) {
          return { ...step, remainingDistanceMeters: Math.round(dist * 1000), stepIndex: i };
        }
      }
    }
    return navSteps[navSteps.length - 1];
  }, [navSteps, currentCoord, destination, remainingDistanceKm]);

  // Voice announcement helper using browser speech synthesis
  const speakInstruction = (text) => {
    if ('speechSynthesis' in window && !isVoiceMuted && text) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis error:', err);
      }
    }
  };

  // Announce upcoming maneuver when approaching
  useEffect(() => {
    if (isMoving && currentStep && currentStep.stepIndex !== undefined) {
      if (currentStep.stepIndex !== lastSpokenStepIndexRef.current) {
        lastSpokenStepIndexRef.current = currentStep.stepIndex;
        const distText = currentStep.remainingDistanceMeters
          ? `In ${currentStep.remainingDistanceMeters} meters, `
          : '';
        speakInstruction(`${distText}${currentStep.instruction}`);
      }
    }
  }, [currentStep?.stepIndex, isMoving, isVoiceMuted]);

  // INITIAL LOAD: Snap to live GPS position or starting point
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          // Find closest point on route polyline
          let closestIdx = 0;
          let minD = Infinity;
          for (let i = 0; i < Math.min(fullCoordinates.length, 50); i++) {
            const d = haversineKm(latitude, longitude, fullCoordinates[i][0], fullCoordinates[i][1]);
            if (d < minD) {
              minD = d;
              closestIdx = i;
            }
          }
          setCurrentIndex(closestIdx);
          setGpsStatus('active');
          lastGpsCoordRef.current = [latitude, longitude];
          lastGpsTimeRef.current = Date.now();
        },
        () => {
          setGpsStatus('searching');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, [fullCoordinates]);

  // 1. REAL GPS NAVIGATION MODE (Google Maps Behavior):
  // The vehicle ONLY moves when the GPS physically moves!
  useEffect(() => {
    if (navMode !== 'gps') {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Geolocation not supported. Switched to Manual Drive.');
      setNavMode('manual');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading } = pos.coords;
        const now = Date.now();
        setGpsStatus('active');

        // Check distance moved from previous reading
        let distMovedMeters = 0;
        if (lastGpsCoordRef.current) {
          distMovedMeters = haversineKm(
            lastGpsCoordRef.current[0], lastGpsCoordRef.current[1],
            latitude, longitude
          ) * 1000;
        }

        const timeDiffSec = (now - lastGpsTimeRef.current) / 1000;
        lastGpsCoordRef.current = [latitude, longitude];
        lastGpsTimeRef.current = now;

        // Determine if car is actually in motion (filter out micro GPS jitter < 2.5m)
        const isDeviceMoving = (speed != null && speed > 0.8) || (distMovedMeters > 2.5 && timeDiffSec > 0.5);

        if (isDeviceMoving) {
          setIsMoving(true);
          const computedSpeed = speed != null && speed > 0
            ? Math.round(speed * 3.6)
            : Math.round((distMovedMeters / Math.max(1, timeDiffSec)) * 3.6);
          setCurrentSpeedKmh(Math.max(5, Math.min(140, computedSpeed)));

          if (heading != null && !isNaN(heading) && heading > 0) {
            setBearing(Math.round(heading));
          }

          // Advance vehicle along the route polyline to nearest point ahead
          let closestIdx = currentIndex;
          let minD = Infinity;
          const searchEnd = Math.min(fullCoordinates.length, currentIndex + 40);
          for (let i = currentIndex; i < searchEnd; i++) {
            const d = haversineKm(latitude, longitude, fullCoordinates[i][0], fullCoordinates[i][1]);
            if (d < minD) {
              minD = d;
              closestIdx = i;
            }
          }

          if (closestIdx > currentIndex) {
            const p1 = fullCoordinates[currentIndex];
            const p2 = fullCoordinates[closestIdx];
            if (p1 && p2 && (!heading || heading === 0)) {
              setBearing(Math.round(calculateBearing(p1[0], p1[1], p2[0], p2[1])));
            }
            setCurrentIndex(closestIdx);
          }

          if (closestIdx >= fullCoordinates.length - 1) {
            setIsCompleted(true);
            speakInstruction('You have arrived at your destination!');
          }
        } else {
          // Vehicle is standing still (waiting at traffic signal / parked)
          setIsMoving(false);
          setCurrentSpeedKmh(0);
        }
      },
      (err) => {
        console.warn('GPS Watch note:', err.message);
        setGpsStatus('searching');
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [navMode, currentIndex, fullCoordinates]);

  // 2. MANUAL INTERACTIVE DRIVE MODE (For desktop testing):
  // User holds/clicks "Drive" to move forward; does NOT auto-run like a video!
  useEffect(() => {
    if (navMode !== 'manual' || !isDrivingManual || isCompleted) {
      if (navMode === 'manual' && !isDrivingManual) {
        setIsMoving(false);
        setCurrentSpeedKmh(0);
      }
      if (manualTimerRef.current) clearInterval(manualTimerRef.current);
      return;
    }

    setIsMoving(true);
    setCurrentSpeedKmh(manualThrottleKmh);

    // Move along coordinates only while drive is active
    const stepInterval = Math.max(80, Math.round(5000 / manualThrottleKmh));
    manualTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= fullCoordinates.length - 1) {
          clearInterval(manualTimerRef.current);
          setIsDrivingManual(false);
          setIsMoving(false);
          setCurrentSpeedKmh(0);
          setIsCompleted(true);
          speakInstruction('You have arrived at your destination!');
          return prev;
        }

        const next = prev + 1;
        const p1 = fullCoordinates[prev];
        const p2 = fullCoordinates[next];
        if (p1 && p2) {
          setBearing(Math.round(calculateBearing(p1[0], p1[1], p2[0], p2[1])));
        }
        return next;
      });
    }, stepInterval);

    return () => {
      if (manualTimerRef.current) clearInterval(manualTimerRef.current);
    };
  }, [navMode, isDrivingManual, manualThrottleKmh, fullCoordinates, isCompleted]);

  // Maneuver Icons
  const getManeuverIcon = (modifier, type) => {
    const mod = (modifier || '').toLowerCase();
    if (mod.includes('left')) return '↰';
    if (mod.includes('right')) return '↱';
    if (mod.includes('uturn')) return '↶';
    if (type === 'roundabout') return '⟳';
    if (type === 'arrive') return '🏁';
    return '↑';
  };

  const nextChargingStop = chargingStops[0] || null;

  return (
    <div className="fixed inset-0 z-[1100] bg-dark-bg text-white flex flex-col overflow-hidden font-sans select-none">
      {/* Leaflet Map Layer */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={currentCoord}
          zoom={16}
          zoomControl={false}
          className="w-full h-full"
          style={{ background: '#0B0E14' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
            maxZoom={19}
          />

          <LiveMapController position={currentCoord} isFollowing={isFollowing} zoom={16} />

          {/* Past route (grayed out) */}
          {traveledPath.length > 1 && (
            <Polyline positions={traveledPath} color="#64748B" weight={5} opacity={0.5} />
          )}

          {/* Active upcoming route (vibrant cyan glow) */}
          {remainingPath.length > 1 && (
            <>
              <Polyline positions={remainingPath} color="#00F0FF" weight={6} opacity={0.95} />
              <Polyline positions={remainingPath} color="#00F0FF" weight={12} opacity={0.2} />
            </>
          )}

          {/* Real EV Charging Stations along corridor */}
          {stationsAlongRoute.map((st, i) => {
            const lat = st.latitude || st.location?.lat;
            const lon = st.longitude || st.location?.lng;
            if (!lat || !lon) return null;
            return (
              <Marker
                key={`nav-st-${i}`}
                position={[lat, lon]}
                icon={navStationIcon}
                eventHandlers={{
                  click: () => setSelectedStation(st),
                }}
              >
                <Popup className="custom-popup">
                  <div className="text-xs p-1">
                    <strong className="text-emerald-400 font-bold">{st.name || 'EV Station'}</strong>
                    <p className="opacity-75">{st.operator || 'OpenStreetMap Network'}</p>
                    <p className="text-primary font-bold mt-1">{st.chargingPowerKW || 50} kW Fast DC</p>
                    <button
                      type="button"
                      onClick={() => setSelectedStation(st)}
                      className="mt-2 w-full py-1 px-2 rounded-lg volt-btn text-[11px] font-bold"
                    >
                      Inspect Station Details
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Live Vehicle Puck (Heading needle rotates in real-time) */}
          <Marker position={currentCoord} icon={createCarIcon(bearing, isMoving)} />
        </MapContainer>
      </div>

      {/* TOP FLOATING NAVIGATION BANNER (Google Maps / Uber Style) */}
      <div className="relative z-10 p-4 max-w-xl mx-auto w-full pointer-events-none">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-3xl dark:bg-dark-surface/95 bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden pointer-events-auto"
        >
          {/* Main Turn Header */}
          <div className={`p-4 text-white flex items-center justify-between gap-4 transition-colors ${
            isMoving
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600'
              : 'bg-gradient-to-r from-slate-800 via-slate-800 to-teal-900'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-black/35 backdrop-blur-md flex items-center justify-center text-3xl font-black text-white flex-shrink-0 shadow-inner">
                {getManeuverIcon(currentStep?.modifier, currentStep?.type)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider flex items-center gap-1.5">
                  {isMoving ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                      <span>{currentStep?.remainingDistanceMeters ? `In ${currentStep.remainingDistanceMeters} m` : 'Upcoming Turn'}</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Vehicle Stationary · Waiting for Motion</span>
                    </>
                  )}
                </p>
                <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight truncate mt-0.5">
                  {currentStep?.instruction || 'Head onto designated route'}
                </h2>
              </div>
            </div>

            {/* Controls: Voice & Exit */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => {
                  const newMuted = !isVoiceMuted;
                  setIsVoiceMuted(newMuted);
                  if (!newMuted) toast.success('Voice navigation active');
                  else toast('Voice navigation muted');
                }}
                className={`p-2.5 rounded-xl transition-colors ${
                  isVoiceMuted ? 'bg-black/30 text-slate-400' : 'bg-white/20 text-white shadow'
                }`}
                title={isVoiceMuted ? 'Unmute Voice' : 'Mute Voice'}
                data-testid="toggle-voice-btn"
              >
                {isVoiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={onClose}
                className="p-2.5 rounded-xl bg-black/40 hover:bg-black/60 text-white transition-colors"
                title="Exit Live Navigation"
                data-testid="exit-nav-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-strip with road name and GPS live status */}
          <div className="px-4 py-2 bg-dark-bg/90 flex items-center justify-between text-xs text-slate-300 border-t border-white/5">
            <span className="flex items-center gap-1.5 truncate">
              <Navigation className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="font-semibold text-white truncate">{currentStep?.road || destination?.address?.split(',')[0]}</span>
            </span>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Battery Survival Confidence Pill */}
              <div
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                  liveSurvivalScore >= 85
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : liveSurvivalScore >= 70
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                }`}
                title={`Battery Survival Confidence: ${liveSurvivalScore}%. Normal: ${baseConfidence}%, Adverse weather: ${survivalConfidence?.adverseConfidencePct || 78}%`}
              >
                <ShieldCheck className="w-3 h-3" />
                <span>{liveSurvivalScore}% Survival Confidence</span>
              </div>

              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1 flex-shrink-0 ${
                isMoving ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isMoving ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {navMode === 'gps'
                  ? isMoving ? 'Live GPS Moving' : 'GPS Standby (0 km/h)'
                  : isMoving ? `Manual Drive (${currentSpeedKmh} km/h)` : 'Parked (0 km/h)'}
              </span>
            </div>
          </div>

          {/* Self-Correcting Energy Intelligence Drift Notice */}
          {isUnexpectedDrain && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="px-4 py-1.5 bg-amber-500/20 border-t border-amber-500/30 flex items-center justify-between text-[11px] text-amber-200"
            >
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span><strong>Self-Correcting Intelligence:</strong> +{consumptionDriftPct}% unexpected battery drain detected on climb/acceleration. Model adapting remaining reserve.</span>
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Battery Reserve Risk & Backup Charger Recommendation Banner */}
        {isReserveAtRisk && backupCharger && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mt-2 rounded-2xl bg-gradient-to-r from-rose-950/90 via-slate-900/95 to-amber-950/90 border border-rose-500/40 p-3 shadow-2xl backdrop-blur-xl pointer-events-auto"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertOctagon className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h4 className="text-xs font-black text-rose-200 tracking-wide uppercase">
                    Battery Reserve Warning · Safety Buffer Breach
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Projected arrival SoC is <strong className="text-rose-400">{projectedArrivalSoc}%</strong> (&lt; {minReservePct}% reserve).
                    {isDetouredToBackup ? (
                      <span className="text-emerald-400 font-bold ml-1">✓ Rerouted to Backup Charger ({backupCharger.name})</span>
                    ) : (
                      <span> Backup charger prepared: <strong className="text-white">{backupCharger.name}</strong> ({backupCharger.detourDistanceKm || 4.2} km detour, {backupCharger.chargingPowerKw || 50} kW DC).</span>
                    )}
                  </p>
                </div>
              </div>

              {!isDetouredToBackup && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDetouredToBackup(true);
                    toast.success(`Routing detour to backup charger: ${backupCharger.name}`);
                    speakInstruction(`Rerouting to backup charger: ${backupCharger.name}`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:brightness-110 text-dark-bg font-black text-xs flex items-center gap-1.5 shadow-lg flex-shrink-0"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Detour to Charger</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>


      {/* FLOATING ACTION CONTROLS (Middle Right) */}
      <div className="relative z-10 flex-1 flex flex-col justify-end p-4 pointer-events-none">
        <div className="self-end flex flex-col gap-2.5 pointer-events-auto">
          {/* Re-Center Button */}
          {!isFollowing && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsFollowing(true)}
              className="p-3.5 rounded-2xl bg-primary text-dark-bg font-extrabold shadow-xl flex items-center gap-2 text-xs"
              title="Re-center on vehicle"
              data-testid="recenter-btn"
            >
              <Crosshair className="w-4 h-4" />
              <span>Re-center</span>
            </motion.button>
          )}

          {/* Navigation Mode Switcher: Live GPS vs Manual Drive */}
          <div className="rounded-2xl dark:bg-dark-surface/90 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-1 flex items-center gap-1 shadow-xl">
            <button
              onClick={() => {
                setNavMode('gps');
                setIsDrivingManual(false);
                toast.success('🛰️ Live GPS mode: Navigation follows actual car movement');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                navMode === 'gps' ? 'bg-emerald-500 text-dark-bg shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Only moves when real vehicle physically moves"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              Live GPS
            </button>
            <button
              onClick={() => {
                setNavMode('manual');
                toast('🎮 Manual Drive mode: Press Drive to simulate motion');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                navMode === 'manual' ? 'bg-primary text-dark-bg shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Interactive desktop drive throttle"
            >
              Manual Drive
            </button>
          </div>

          {/* Manual Drive Throttle Buttons (Only when in manual mode) */}
          {navMode === 'manual' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl dark:bg-dark-surface/95 bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 p-2.5 flex flex-col gap-2 shadow-2xl"
            >
              <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider text-center">
                Driver Throttle
              </p>

              {/* Main Drive / Stop Toggle */}
              <button
                onClick={() => setIsDrivingManual(!isDrivingManual)}
                className={`py-2 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                  isDrivingManual
                    ? 'bg-amber-500 hover:bg-amber-600 text-dark-bg'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-dark-bg'
                }`}
                data-testid="drive-toggle-btn"
              >
                {isDrivingManual ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Stop / Brake (0 km/h)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-dark-bg" />
                    <span>Drive / Accelerate</span>
                  </>
                )}
              </button>

              {/* Throttle Speed Presets */}
              <div className="flex items-center gap-1 justify-center pt-1">
                {[
                  { label: '35 km/h', val: 35 },
                  { label: '65 km/h', val: 65 },
                  { label: '100 km/h', val: 100 },
                ].map((spd) => (
                  <button
                    key={spd.val}
                    onClick={() => setManualThrottleKmh(spd.val)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                      manualThrottleKmh === spd.val
                        ? 'bg-primary text-dark-bg font-extrabold'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* FLOATING OBD-II / TELEMATICS HUD (Bottom Left) */}
      <div className="absolute bottom-28 left-4 z-20 pointer-events-auto">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="rounded-2xl dark:bg-dark-surface/90 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-3 shadow-2xl space-y-2 text-xs"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1.5">
            <div className="flex items-center gap-1.5 font-bold text-cyan-400">
              <Cpu className="w-3.5 h-3.5" />
              <span className="font-mono text-[11px]">{connectionType === 'bluetooth_obd' ? 'OBD-II BLE' : connectionType === 'oem_telematics' ? 'OEM Cloud' : 'OBD Virtual'}</span>
            </div>
            <button
              type="button"
              onClick={() => openObdModal(true)}
              className="text-[10px] text-primary hover:underline font-mono"
            >
              Configure
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono">
            <span className="text-dark-muted">Power Draw:</span>
            <span className={livePowerKw > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
              {livePowerKw > 0 ? `+${livePowerKw} kW` : `${livePowerKw} kW regen`}
            </span>

            <span className="text-dark-muted">Pack Temp:</span>
            <span className="text-white font-bold">{telemetry.batteryTempC} °C</span>

            <span className="text-dark-muted">Pack Bus:</span>
            <span className="text-white font-bold">{telemetry.packVoltageV} V</span>

            <span className="text-dark-muted">Drain Drift:</span>
            <span className={consumptionDriftPct > 10 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {consumptionDriftPct > 0 ? `+${consumptionDriftPct}%` : `${consumptionDriftPct}%`}
            </span>
          </div>
        </motion.div>
      </div>

      {/* BOTTOM COCKPIT / HUD DASHBOARD (Rapido / Uber / Google Maps Style) */}
      <div className="relative z-10 p-4 max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-3xl dark:bg-dark-surface/95 bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl p-4 sm:p-5 space-y-3.5"
        >
          {/* Telemetry Metrics Row: Speed, Battery SoC, Remaining Distance, ETA */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
            {/* Speedometer */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Speed</span>
              <p className={`text-xl sm:text-2xl font-black font-mono mt-0.5 ${
                isMoving ? 'text-cyan-400' : 'text-slate-400'
              }`}>
                {currentSpeedKmh}
              </p>
              <span className={`text-[9px] font-bold ${
                isMoving ? 'text-cyan-400' : 'text-slate-500'
              }`}>
                {isMoving ? 'km/h driving' : '0 km/h parked'}
              </span>
            </div>

            {/* Battery SoC & Reserve */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Battery className="w-3 h-3 text-emerald-400" /> Battery
              </span>
              <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-0.5">
                {currentSoc}%
              </p>
              <span className={`text-[9px] font-semibold ${isReserveAtRisk ? 'text-rose-400' : 'text-slate-400'}`}>
                {projectedArrivalSoc}% at dest (min {minReservePct}%)
              </span>
            </div>


            {/* Remaining Distance */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Route className="w-3 h-3 text-primary" /> Remaining
              </span>
              <p className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5">
                {remainingDistanceKm}
              </p>
              <span className="text-[9px] text-slate-400 font-medium">km to go</span>
            </div>

            {/* ETA */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-secondary" /> ETA
              </span>
              <p className="text-xl sm:text-2xl font-black text-secondary font-mono mt-0.5">
                {remainingMinutes}
              </p>
              <span className="text-[9px] text-slate-400 font-medium">mins</span>
            </div>
          </div>

          {/* Interactive Route Scrubber (Allows dragging car anywhere along the route) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{origin?.address?.split(',')[0]}</span>
              <span className="text-primary font-bold">{Math.round(progressRatio * 100)}% complete</span>
              <span>{destination?.address?.split(',')[0]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(1, fullCoordinates.length - 1)}
              value={currentIndex}
              onChange={(e) => {
                const newIdx = parseInt(e.target.value, 10);
                setCurrentIndex(newIdx);
                const p1 = fullCoordinates[Math.max(0, newIdx - 1)];
                const p2 = fullCoordinates[newIdx];
                if (p1 && p2) {
                  setBearing(Math.round(calculateBearing(p1[0], p1[1], p2[0], p2[1])));
                }
              }}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-white/10 rounded-lg appearance-none"
              title="Scrub vehicle position along route"
            />
          </div>

          {/* Next EV Charging Alert Bar */}
          {nextChargingStop && (
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-emerald-400 truncate">
                    Next Stop: {nextChargingStop.stationName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    +{nextChargingStop.energyAddedKwh?.toFixed(0)} kWh · {nextChargingStop.chargingPowerKw || 50} kW Fast DC
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStation(nextChargingStop)}
                className="px-2.5 py-1 rounded-lg volt-btn text-[11px] font-bold flex items-center gap-1 flex-shrink-0"
              >
                <Eye className="w-3 h-3" />
                <span>Info</span>
              </button>
            </div>
          )}

          {/* Action Row: End Journey & Status Note */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Radio className={`w-3 h-3 ${isMoving ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span>{navMode === 'gps' ? 'GPS updates on car movement' : 'Manual throttle active'}</span>
            </span>

            <button
              onClick={onClose}
              className="py-2 px-3.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold text-xs flex items-center gap-1.5 transition-all"
              data-testid="end-journey-btn"
            >
              <X className="w-3.5 h-3.5" />
              <span>End Journey</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* CELEBRATION MODAL ON DESTINATION ARRIVAL */}
      <AnimatePresence>
        {isCompleted && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full max-w-md rounded-3xl dark:bg-dark-surface bg-slate-900 border border-emerald-500/30 p-6 text-center space-y-4 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h3 className="text-2xl font-black text-white">
                Destination Arrived!
              </h3>
              <p className="text-xs text-slate-300">
                You have reached <strong className="text-white">{destination?.address?.split(',')[0]}</strong>.
              </p>

              <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/10 text-center">
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-bold">Total Distance</p>
                  <p className="text-lg font-black text-cyan-400 font-mono mt-0.5">{totalTripKm} km</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-bold">Energy Used</p>
                  <p className="text-lg font-black text-emerald-400 font-mono mt-0.5">{energyUsedKwh.toFixed(1)} kWh</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-bold">Final Battery</p>
                  <p className="text-lg font-black text-yellow-400 font-mono mt-0.5">{currentSoc}%</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-center gap-2">
                <Award className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Saved ~{((energyUsedKwh * 0.45) || 5.2).toFixed(1)} kg CO2 emissions vs fossil fuel car!</span>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-xl volt-btn font-extrabold text-sm"
              >
                Back to Trip Summary
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Station Inspector Modal if clicked during navigation */}
      {selectedStation && (
        <StationDetailDrawer
          station={selectedStation}
          vehicle={vehicle}
          onClose={() => setSelectedStation(null)}
        />
      )}
    </div>
  );
};

export default LiveNavigationOverlay;
