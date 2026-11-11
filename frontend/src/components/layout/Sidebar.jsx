import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Route, MapPin, Zap, Clock, User, Settings,
  ChevronLeft, ChevronRight, Activity, Car, GitCompareArrows,
} from 'lucide-react';
import { ROUTES } from '../../config/constants';

const navItems = [
  { path: ROUTES.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
  { path: ROUTES.VEHICLES, icon: Car, label: 'EV Library' },
  { path: ROUTES.COMPARE_EVS, icon: GitCompareArrows, label: 'Compare EVs' },
  { path: ROUTES.ROUTE_PLANNER, icon: Route, label: 'Route Planner' },
  { path: ROUTES.CHARGING_STATIONS, icon: MapPin, label: 'Stations' },
  { path: ROUTES.SIMULATIONS, icon: Activity, label: 'Simulations' },
  { path: ROUTES.HISTORY, icon: Clock, label: 'Trip History' },
  { path: ROUTES.PROFILE, icon: User, label: 'Profile' },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex-shrink-0 h-screen dark:bg-dark-surface bg-white border-r dark:border-dark-border border-light-border flex flex-col z-20 overflow-hidden"
      data-testid="sidebar"
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b dark:border-dark-border border-light-border h-16">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-volt flex items-center justify-center">
                <Zap className="w-4 h-4 text-dark-bg" />
              </div>
              <span className="font-display font-bold text-lg dark:text-dark-text text-light-text">EcoTrack AI</span>
            </motion.div>
          )}
        </AnimatePresence>

        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-volt flex items-center justify-center mx-auto">
            <Zap className="w-4 h-4 text-dark-bg" />
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg dark:text-dark-muted text-light-muted dark:hover:bg-dark-highlight hover:bg-light-highlight transition-colors ml-auto"
          data-testid="sidebar-toggle"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'dark:text-dark-muted text-light-muted dark:hover:bg-dark-highlight hover:bg-light-highlight dark:hover:text-dark-text hover:text-light-text'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                  transition={{ duration: 0.2 }}
                />
              )}
              <item.icon className={`w-5 h-5 flex-shrink-0 relative z-10 ${isActive ? 'text-primary' : ''}`} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden relative z-10"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t dark:border-dark-border border-light-border">
        <NavLink
          to={ROUTES.PROFILE}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl dark:text-dark-muted text-light-muted dark:hover:bg-dark-highlight hover:bg-light-highlight transition-colors"
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-sm font-medium whitespace-nowrap overflow-hidden"
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
