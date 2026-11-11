import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getMe } from '../services/authService';

const AuthContext = createContext(null);

const DEFAULT_USER = {
  userId: 'ecotrack_driver',
  name: 'EcoTrack EV Driver',
  email: 'driver@ecotrack.ai',
  picture: '',
  authProvider: 'direct',
  defaultVehicle: {
    name: 'Tata Nexon EV Max',
    batteryCapacityKwh: 40.5,
    usableBatteryPct: 90,
    efficiencyKwhPer100km: 15,
    minReserveSocPct: 15,
    targetChargeSocPct: 80,
    chargingPowerKw: 50,
    electricityRatePerKwh: 8,
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ecotrack_user') || localStorage.getItem('voltpath_user');
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [loading, setLoading] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const res = await getMe();
      if (res?.data?.data) {
        setUser(res.data.data);
        localStorage.setItem('ecotrack_user', JSON.stringify(res.data.data));
      }
    } catch {
      // Offline or error - retain local/default user
    } finally {
      setIsAuthenticated(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const loginWithToken = (token, userData) => {
    if (token) localStorage.setItem('ecotrack_token', token);
    if (userData) {
      localStorage.setItem('ecotrack_user', JSON.stringify(userData));
      setUser(userData);
    }
    setIsAuthenticated(true);
  };

  const signOut = () => {
    localStorage.removeItem('ecotrack_token');
    localStorage.setItem('ecotrack_user', JSON.stringify(DEFAULT_USER));
    setUser(DEFAULT_USER);
    setIsAuthenticated(true);
  };

  const updateUser = (data) => {
    setUser((prev) => {
      const updated = { ...prev, ...data };
      localStorage.setItem('ecotrack_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: true, loading: false, loginWithToken, signOut, updateUser, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
