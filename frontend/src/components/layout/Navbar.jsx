import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Moon, Sun, Bell, Zap, Cpu, Bluetooth } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useTelemetry } from '../../context/TelemetryContext';
import { getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/route-planner': 'Route Planner',
  '/trip-results': 'Trip Results',
  '/charging-stations': 'Charging Stations',
  '/simulations': 'Simulations',
  '/history': 'Trip History',
  '/profile': 'Profile & Settings',
  '/vehicles': 'EV Vehicle Library',
};

const Navbar = () => {
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { connectionType, telemetry, setIsModalOpen } = useTelemetry();
  const navigate = useNavigate();
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'EcoTrack AI';

  return (
    <header className="h-16 border-b dark:border-dark-border border-light-border dark:bg-dark-surface bg-white flex items-center justify-between px-6 flex-shrink-0" data-testid="navbar">
      <div>
        <h1 className="text-lg font-bold dark:text-dark-text text-light-text font-display">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* OBD-II & Telematics Status Pill */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsModalOpen(true)}
          className={`h-9 px-3 rounded-xl flex items-center gap-2 text-xs font-bold transition-all border ${
            connectionType !== 'disconnected'
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
              : 'dark:bg-dark-highlight bg-light-highlight border-transparent dark:text-dark-muted text-light-muted hover:text-white'
          }`}
          title="Configure OBD-II Bluetooth & OEM Telematics"
        >
          <span className={`w-2 h-2 rounded-full ${
            connectionType !== 'disconnected' ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'
          }`} />
          <Cpu className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-mono">
            {connectionType === 'bluetooth_obd' ? 'OBD-II BLE' : connectionType === 'oem_telematics' ? 'Cloud API' : 'OBD Live'}
          </span>
          <span className="font-mono px-1.5 py-0.5 rounded text-[11px] bg-black/40 text-cyan-300">
            {telemetry.socPct}%
          </span>
        </motion.button>

        {/* Theme Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center dark:bg-dark-highlight bg-light-highlight dark:text-dark-muted text-light-muted hover:text-primary transition-colors"
          data-testid="theme-toggle"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </motion.button>

        {/* Notification */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-9 h-9 rounded-xl flex items-center justify-center dark:bg-dark-highlight bg-light-highlight dark:text-dark-muted text-light-muted hover:text-primary transition-colors relative"
          data-testid="notifications-btn"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full"></span>
        </motion.button>

        {/* User Profile */}
        <div 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 ml-1 cursor-pointer hover:opacity-85 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-volt flex items-center justify-center font-bold text-dark-bg text-sm">
            {user?.picture
              ? <img src={user.picture} alt={user.name} className="w-9 h-9 rounded-xl object-cover" />
              : getInitials(user?.name || 'EcoTrack EV Driver')
            }
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold dark:text-dark-text text-light-text leading-none">{user?.name || 'EcoTrack EV Driver'}</p>
            <p className="text-xs dark:text-dark-muted text-light-muted">{user?.email || 'driver@ecotrack.ai'}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
