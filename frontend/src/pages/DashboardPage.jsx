import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Route, Zap, MapPin, Clock, TrendingUp, Battery, ArrowRight, Plus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { getTripStats, getTrips } from '../services/authService';
import StatCard from '../components/common/StatCard';
import { staggerContainer, staggerItem } from '../animations/variants';
import { formatDistance, formatTime, formatEnergy, formatCost } from '../utils/helpers';
import toast from 'react-hot-toast';

const ROUTES_PATH = '/route-planner';

const mockChartData = [
  { name: 'Mon', distance: 0 }, { name: 'Tue', distance: 0 },
  { name: 'Wed', distance: 0 }, { name: 'Thu', distance: 0 },
  { name: 'Fri', distance: 0 }, { name: 'Sat', distance: 0 }, { name: 'Sun', distance: 0 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-dark-surface border border-dark-border rounded-xl px-4 py-3 text-sm shadow-xl">
        <p className="dark:text-dark-muted text-sm">{label}</p>
        <p className="text-primary font-bold">{payload[0].value} km</p>
      </div>
    );
  }
  return null;
};

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentTrips, setRecentTrips] = useState([]);
  const [chartData, setChartData] = useState(mockChartData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, tripsRes] = await Promise.all([getTripStats(), getTrips({ limit: 5 })]);
        setStats(statsRes.data.data);
        setRecentTrips(tripsRes.data.data.trips);

        // Build last 7 days chart
        const trips = tripsRes.data.data.trips;
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date().getDay();
        const data = Array.from({ length: 7 }, (_, i) => {
          const dayIdx = (today - 6 + i + 7) % 7;
          return { name: days[dayIdx], distance: 0 };
        });

        trips.forEach(trip => {
          const d = new Date(trip.createdAt);
          const diff = Math.floor((Date.now() - d) / 86400000);
          if (diff < 7 && data[6 - diff]) {
            data[6 - diff].distance = (data[6 - diff].distance || 0) + (trip.summary?.totalDistanceKm || 0);
          }
        });

        setChartData(data);
      } catch (err) {
        // No data yet
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statItems = [
    { icon: Route, label: 'Total Trips', value: stats?.totalTrips ?? 0, color: 'primary', delay: 0 },
    { icon: MapPin, label: 'Total Distance', value: stats?.totalDistanceKm?.toFixed(0) ?? '0', unit: 'km', color: 'secondary', delay: 0.1 },
    { icon: Zap, label: 'Energy Consumed', value: stats?.totalEnergyKwh?.toFixed(0) ?? '0', unit: 'kWh', color: 'green', delay: 0.2 },
    { icon: TrendingUp, label: 'Total Spent', value: `₹${stats?.totalCostUsd?.toFixed(2) ?? '0.00'}`, color: 'orange', delay: 0.3 },
  ];

  return (
    <div className="p-6 space-y-6 dark:text-dark-text text-light-text">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold dark:text-dark-text text-light-text">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
            <span className="text-gradient-volt">{user?.name?.split(' ')[0] || 'Driver'}</span>
          </h2>
          <p className="text-sm dark:text-dark-muted text-light-muted mt-0.5">Here's your EcoTrack AI overview</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/route-planner')}
          className="flex items-center gap-2 px-5 py-2.5 volt-btn rounded-xl text-sm font-semibold"
          data-testid="plan-new-trip-btn"
        >
          <Plus className="w-4 h-4" />
          Plan Trip
        </motion.button>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statItems.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </motion.div>

      {/* Chart + Recent Trips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold dark:text-dark-text text-light-text">Weekly Distance</h3>
              <p className="text-xs dark:text-dark-muted text-light-muted mt-0.5">Last 7 days activity</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
              <span className="text-xs dark:text-dark-muted text-light-muted">Distance (km)</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="voltGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00F0FF" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2D3342" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="distance" stroke="#00F0FF" strokeWidth={2} fill="url(#voltGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border p-6 flex flex-col"
        >
          <h3 className="font-bold dark:text-dark-text text-light-text mb-4">Quick Stats</h3>
          <div className="space-y-4 flex-1">
            {[
              { label: 'Avg Trip Distance', value: formatDistance(stats?.avgDistanceKm), icon: Route },
              { label: 'Charging Stops', value: stats?.totalChargingStops ?? 0, icon: Battery },
              { label: 'Avg Energy/Trip', value: stats?.totalTrips > 0 ? formatEnergy(stats.totalEnergyKwh / stats.totalTrips) : '0 kWh', icon: Zap },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs dark:text-dark-muted text-light-muted">{item.label}</p>
                  <p className="font-bold text-sm stat-number dark:text-dark-text text-light-text">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/route-planner')}
            className="mt-4 w-full py-2.5 rounded-xl border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
            data-testid="start-planning-btn"
          >
            Start Planning <ArrowRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </div>

      {/* Recent Trips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border"
      >
        <div className="flex items-center justify-between p-6 pb-4">
          <h3 className="font-bold dark:text-dark-text text-light-text">Recent Trips</h3>
          <button
            onClick={() => navigate('/history')}
            className="text-sm text-primary hover:underline flex items-center gap-1"
            data-testid="view-all-trips-btn"
          >
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentTrips.length === 0 ? (
          <div className="px-6 pb-6 text-center py-8">
            <Route className="w-12 h-12 dark:text-dark-muted text-light-muted mx-auto mb-3 opacity-50" />
            <p className="dark:text-dark-muted text-light-muted text-sm">No trips yet. Plan your first EV journey!</p>
            <button
              onClick={() => navigate('/route-planner')}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Plan a trip →
            </button>
          </div>
        ) : (
          <div className="divide-y dark:divide-dark-border divide-light-border">
            {recentTrips.map((trip) => (
              <div key={trip.tripId} className="px-6 py-4 flex items-center justify-between hover:dark:bg-dark-highlight hover:bg-light-highlight transition-colors cursor-pointer" data-testid="recent-trip-item">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Route className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold dark:text-dark-text text-light-text">
                      {trip.origin?.address?.split(',')[0]} → {trip.destination?.address?.split(',')[0]}
                    </p>
                    <p className="text-xs dark:text-dark-muted text-light-muted">{new Date(trip.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary stat-number">{formatDistance(trip.summary?.totalDistanceKm)}</p>
                  <p className="text-xs dark:text-dark-muted text-light-muted">{trip.summary?.numberOfChargingStops || 0} stops</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default DashboardPage;
