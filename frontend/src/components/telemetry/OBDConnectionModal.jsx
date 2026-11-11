import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bluetooth, Cpu, Cloud, Zap, CheckCircle2, AlertCircle,
  Radio, X, RefreshCw, Activity, ShieldCheck, BatteryCharging,
  Sliders, Gauge, Car, ArrowRight, HelpCircle
} from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

const OEM_PROVIDERS = [
  {
    id: 'tata-zconnect',
    name: 'Tata ZConnect',
    tagline: 'Nexon EV, Punch EV, Tiago EV',
    iconColor: '#00F0FF',
    badge: 'Popular (India)',
    voltage: '350V',
  },
  {
    id: 'tesla-fleet',
    name: 'Tesla Fleet API',
    tagline: 'Model 3, Model Y, Model S, Cybertruck',
    iconColor: '#E63946',
    badge: 'Global Cloud',
    voltage: '400V',
  },
  {
    id: 'hyundai-bluelink',
    name: 'Hyundai Bluelink',
    tagline: 'Ioniq 5, Kona Electric, Creta EV',
    iconColor: '#3B82F6',
    badge: 'Connected Care',
    voltage: '400V / 800V',
  },
  {
    id: 'mg-ismart',
    name: 'MG i-SMART',
    tagline: 'ZS EV, Comet EV',
    iconColor: '#10B981',
    badge: 'Connected Suite',
    voltage: '380V',
  },
  {
    id: 'smartcar-api',
    name: 'Smartcar Standardized API',
    tagline: 'BMW, Mercedes, Audi, Ford, Rivian',
    iconColor: '#8B5CF6',
    badge: 'Universal OEM',
    voltage: 'Multi-Pack',
  },
];

const OBDConnectionModal = () => {
  const {
    isModalOpen, setIsModalOpen, connectionType, setConnectionType,
    deviceInfo, telemetry, isScanningBluetooth,
    connectBluetoothObd, connectOemTelematics, disconnectTelemetry,
    updateTelemetry,
  } = useTelemetry();

  const [activeTab, setActiveTab] = useState('obd'); // 'obd' | 'oem' | 'monitor'
  const [testThrottle, setTestThrottle] = useState(60);
  const [testGradient, setTestGradient] = useState(2.0);
  const [testHvac, setTestHvac] = useState(true);

  if (!isModalOpen) return null;

  const handleSimulateUpdate = () => {
    const power = parseFloat(((testThrottle / 100) * 14 + (testGradient / 100) * 22 + (testHvac ? 1.4 : 0.2)).toFixed(1));
    updateTelemetry({
      speedKmh: testThrottle,
      instantPowerKw: power,
      hvacDrawKw: testHvac ? 1.4 : 0.2,
      gearState: testThrottle > 0 ? 'D' : 'P',
    });
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-3xl bg-dark-surface border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900 via-dark-surface to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">Vehicle Telematics & OBD-II Engine</h3>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  connectionType !== 'disconnected' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {connectionType === 'bluetooth_obd' ? 'OBD-II Bluetooth Active' : connectionType === 'oem_telematics' ? 'OEM Cloud Active' : connectionType === 'simulated' ? 'Virtual Stream Active' : 'Disconnected'}
                </span>
              </div>
              <p className="text-xs text-dark-muted">Real-time CAN bus telemetry normalization, SoC % streaming, and failure-aware reserve modeling</p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(false)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-slate-900/60 p-2 gap-2">
          <button
            onClick={() => setActiveTab('obd')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'obd' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-dark-muted hover:text-white'
            }`}
          >
            <Bluetooth className="w-4 h-4" />
            <span>Bluetooth OBD-II (ELM327)</span>
          </button>
          <button
            onClick={() => setActiveTab('oem')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'oem' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-dark-muted hover:text-white'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Manufacturer Cloud APIs</span>
          </button>
          <button
            onClick={() => setActiveTab('monitor')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'monitor' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-dark-muted hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Normalized Telemetry Stream</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'obd' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-2xl">
                    <Bluetooth className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Pair Bluetooth OBD-II Dongle</h4>
                    <p className="text-xs text-dark-muted mt-0.5">Plug ELM327 BLE dongle into your EV OBD-II port under steering wheel</p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-cyan-400 font-mono">
                      <span>Protocol: ISO 15765-4 CAN</span>
                      <span>•</span>
                      <span>Standard EV PIDs (012F, 010D, 0105, 0142)</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={connectBluetoothObd}
                  disabled={isScanningBluetooth}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl volt-btn font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50"
                >
                  {isScanningBluetooth ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Scanning Bluetooth...</span>
                    </>
                  ) : (
                    <>
                      <Bluetooth className="w-4 h-4" />
                      <span>Scan & Connect Dongle</span>
                    </>
                  )}
                </button>
              </div>

              {/* Supported OBD PIDs Grid */}
              <div>
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Normalized OBD-II EV Parameters</h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { pid: '01 2F', label: 'Battery SoC %', desc: 'Normalized 0-100% capacity', val: `${telemetry.socPct}%` },
                    { pid: '01 0D', label: 'Vehicle Speed', desc: 'CAN bus speed reading', val: `${telemetry.speedKmh} km/h` },
                    { pid: '01 05', label: 'Coolant / Pack Temp', desc: 'Battery thermal status', val: `${telemetry.batteryTempC} °C` },
                    { pid: '01 42', label: 'Control Voltage', desc: 'High voltage bus', val: `${telemetry.packVoltageV} V` },
                    { pid: '01 5B', label: 'Battery Health (SoH)', desc: 'Remaining lifetime capacity', val: `${telemetry.sohPct}%` },
                    { pid: '22 11 54', label: 'Instant Power', desc: 'Real-time discharge / regen', val: `${telemetry.instantPowerKw} kW` },
                    { pid: '22 11 56', label: 'HVAC Draw', desc: 'Cabin climate power draw', val: `${telemetry.hvacDrawKw} kW` },
                    { pid: 'STATUS', label: 'CAN Protocol', desc: 'Baud rate 500k 11-bit', val: 'ISO 15765-4' },
                  ].map((p, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">{p.pid}</span>
                        <span className="text-xs font-bold text-white font-mono">{p.val}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-200 mt-1">{p.label}</p>
                      <p className="text-[10px] text-dark-muted">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disconnect or switch button */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-dark-muted">No physical dongle? Virtual telemetry simulator is automatically active.</span>
                {connectionType !== 'disconnected' && (
                  <button
                    onClick={disconnectTelemetry}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold transition-colors"
                  >
                    Disconnect Telemetry
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'oem' && (
            <div className="space-y-4">
              <p className="text-xs text-dark-muted">
                Connect your EV manufacturer's cloud telematics account. EcoTrack AI securely polls normalized vehicle status (SoC %, pack voltage, GPS, and odometer) without hardware dongles.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {OEM_PROVIDERS.map((oem) => (
                  <div
                    key={oem.id}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-primary/40 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                          {oem.badge}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">{oem.voltage}</span>
                      </div>
                      <h4 className="font-bold text-white text-base mt-2 flex items-center gap-2">
                        {oem.name}
                      </h4>
                      <p className="text-xs text-dark-muted mt-1">{oem.tagline}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => connectOemTelematics(oem.name)}
                      className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-primary hover:text-black text-xs font-bold text-white border border-white/10 transition-all flex items-center justify-center gap-2 group-hover:border-primary"
                    >
                      <span>Connect {oem.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'monitor' && (
            <div className="space-y-6">
              {/* Live Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">Battery SoC</span>
                    <BatteryCharging className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-white mt-2">{telemetry.socPct}%</div>
                  <p className="text-[11px] text-emerald-300/80 mt-1">Reserve safe (&gt; 15%)</p>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/25">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400">Pack Voltage</span>
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-black text-white mt-2">{telemetry.packVoltageV} V</div>
                  <p className="text-[11px] text-cyan-300/80 mt-1">Bus nominal ~350V</p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400">Instant Power</span>
                    <Gauge className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-white mt-2">{telemetry.instantPowerKw} kW</div>
                  <p className="text-[11px] text-amber-300/80 mt-1">{telemetry.instantDrainRate}</p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400">Pack Temp</span>
                    <Activity className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-black text-white mt-2">{telemetry.batteryTempC} °C</div>
                  <p className="text-[11px] text-purple-300/80 mt-1">{telemetry.thermalStatus?.label || 'Optimal'}</p>
                </div>
              </div>

              {/* Virtual Telemetry Controls (Interactive simulation testing) */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-primary" />
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">Virtual Telemetry Drive Injector</h5>
                  </div>
                  <span className="text-[11px] text-dark-muted font-mono">Test live sensor responses</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-dark-muted block mb-1">Vehicle Speed ({testThrottle} km/h)</label>
                    <input
                      type="range"
                      min="0"
                      max="140"
                      value={testThrottle}
                      onChange={(e) => {
                        setTestThrottle(Number(e.target.value));
                        handleSimulateUpdate();
                      }}
                      className="w-full accent-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-dark-muted block mb-1">Road Gradient ({testGradient}%)</label>
                    <input
                      type="range"
                      min="-6"
                      max="10"
                      step="0.5"
                      value={testGradient}
                      onChange={(e) => {
                        setTestGradient(Number(e.target.value));
                        handleSimulateUpdate();
                      }}
                      className="w-full accent-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <span className="text-xs text-dark-muted">Cabin A/C HVAC Load</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTestHvac(!testHvac);
                        handleSimulateUpdate();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        testHvac ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {testHvac ? 'A/C Active (1.4 kW)' : 'A/C Off (0.2 kW)'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs text-slate-300 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Self-Correcting Energy Intelligence active:</strong> EcoTrack compares live normalized CAN bus power draw against the aerodynamic & terrain baseline. If uphill gradients or traffic increase consumption by &gt; 10%, route predictions auto-adapt in real time.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/90 flex items-center justify-between">
          <div className="text-xs text-dark-muted flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Connected via {deviceInfo.provider}</span>
          </div>
          <button
            onClick={() => setIsModalOpen(false)}
            className="px-5 py-2 rounded-xl volt-btn text-xs font-bold"
          >
            Apply & Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OBDConnectionModal;
