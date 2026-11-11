import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Battery, Save, Zap, Shield, Car } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateVehicle } from '../services/authService';
import { getInitials } from '../utils/helpers';
import { DEFAULT_VEHICLE } from '../config/constants';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const veh = user?.defaultVehicle || DEFAULT_VEHICLE;

  const [vehicle, setVehicle] = useState({ ...veh });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setVehicle(p => ({ ...p, [e.target.name]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateVehicle(vehicle);
      updateUser({ defaultVehicle: vehicle });
      toast.success('Vehicle settings saved!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const InputField = ({ label, name, value, type = 'text', unit, min, max, step, readOnly = false }) => (
    <div>
      <label className="block text-xs dark:text-dark-muted text-light-muted mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type={type} name={name} value={value} onChange={handleChange}
          readOnly={readOnly} min={min} max={max} step={step}
          className={`w-full px-4 py-2.5 rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-highlight bg-light-highlight dark:text-dark-text text-light-text text-sm focus:outline-none focus:border-primary transition-all pr-12 ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
          data-testid={`vehicle-${name}`}
        />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs dark:text-dark-muted text-light-muted">{unit}</span>}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold dark:text-dark-text text-light-text">Profile & Settings</h2>
        <p className="text-sm dark:text-dark-muted text-light-muted mt-0.5">Manage your account and vehicle configuration</p>
      </motion.div>

      {/* User Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border p-6 flex items-center gap-5"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-volt flex items-center justify-center font-bold text-dark-bg text-2xl flex-shrink-0">
          {user?.picture
            ? <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-2xl object-cover" />
            : getInitials(user?.name || 'U')
          }
        </div>
        <div>
          <h3 className="font-bold dark:text-dark-text text-light-text text-lg">{user?.name}</h3>
          <p className="text-sm dark:text-dark-muted text-light-muted">{user?.email}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <span className="text-xs dark:text-dark-muted text-light-muted">Active Driver Profile</span>
          </div>
        </div>
      </motion.div>

      {/* Vehicle Settings */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border p-6 space-y-5"
      >
        <h3 className="font-bold dark:text-dark-text text-light-text flex items-center gap-2">
          <Car className="w-4 h-4 text-primary" /> Default Vehicle Configuration
        </h3>

        <InputField label="Vehicle Name" name="name" value={vehicle.name} />

        <div>
          <h4 className="text-xs font-semibold dark:text-dark-muted text-light-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Battery className="w-3.5 h-3.5 text-secondary" /> Battery
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Battery Capacity" name="batteryCapacityKwh" value={vehicle.batteryCapacityKwh} type="number" unit="kWh" min={10} max={200} step={1} />
            <InputField label="Usable Battery" name="usableBatteryPct" value={vehicle.usableBatteryPct} type="number" unit="%" min={50} max={100} step={1} />
            <InputField label="Min Reserve SoC" name="minReserveSocPct" value={vehicle.minReserveSocPct} type="number" unit="%" min={5} max={30} step={1} />
            <InputField label="Target Charge SoC" name="targetChargeSocPct" value={vehicle.targetChargeSocPct} type="number" unit="%" min={50} max={100} step={5} />
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold dark:text-dark-muted text-light-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" /> Efficiency & Charging
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Energy Efficiency" name="efficiencyKwhPer100km" value={vehicle.efficiencyKwhPer100km} type="number" unit="kWh/100km" min={5} max={50} step={0.5} />
            <InputField label="Max Charging Power" name="chargingPowerKw" value={vehicle.chargingPowerKw} type="number" unit="kW" min={7} max={350} step={1} />
            <InputField label="Electricity Rate" name="electricityRatePerKwh" value={vehicle.electricityRatePerKwh} type="number" unit="$/kWh" min={0.05} max={2} step={0.01} />
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          onClick={handleSave} disabled={saving}
          className="w-full py-3 volt-btn rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          data-testid="save-vehicle-btn"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Vehicle Settings'}
        </motion.button>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
