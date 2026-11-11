import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Route, Clock, Zap, MapPin, Trash2, Eye, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTrips, deleteTrip } from '../services/authService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDistance, formatTime, formatCost } from '../utils/helpers';
import { staggerContainer, staggerItem } from '../animations/variants';
import toast from 'react-hot-toast';

const TripHistoryPage = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTrips = async (p = 1) => {
    setLoading(true);
    try {
      const res = await getTrips({ page: p, limit: 10 });
      setTrips(res.data.data.trips);
      setTotalPages(res.data.data.pages);
      setPage(p);
    } catch {
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrips(); }, []);

  const handleDelete = async (tripId) => {
    setDeleting(tripId);
    try {
      await deleteTrip(tripId);
      setTrips(prev => prev.filter(t => t.tripId !== tripId));
      toast.success('Trip deleted');
    } catch {
      toast.error('Failed to delete trip');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><LoadingSpinner size="lg" text="Loading trips..." /></div>;

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold dark:text-dark-text text-light-text">Trip History</h2>
          <p className="text-sm dark:text-dark-muted text-light-muted mt-0.5">{trips.length > 0 ? `${trips.length} trips on this page` : 'No trips yet'}</p>
        </div>
        <button onClick={() => navigate('/route-planner')} className="flex items-center gap-2 px-4 py-2 volt-btn rounded-xl text-sm font-semibold" data-testid="new-trip-btn">
          Plan New Trip <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>

      {trips.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
          <Route className="w-16 h-16 dark:text-dark-muted text-light-muted opacity-30 mb-4" />
          <h3 className="font-bold dark:text-dark-text text-light-text mb-2">No trips yet</h3>
          <p className="text-sm dark:text-dark-muted text-light-muted mb-4">Start planning your first EV journey</p>
          <button onClick={() => navigate('/route-planner')} className="px-6 py-2.5 volt-btn rounded-xl text-sm font-semibold">
            Plan Your First Trip
          </button>
        </motion.div>
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
          {trips.map((trip) => (
            <motion.div
              key={trip.tripId} variants={staggerItem}
              className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border p-5 hover:border-primary/30 transition-all cursor-pointer group"
              onClick={() => navigate(`/trip/${trip.tripId}`)}
              data-testid="trip-history-item"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Route className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold dark:text-dark-text text-light-text text-sm truncate">
                        {trip.origin?.address?.split(',').slice(0, 2).join(',')}
                      </p>
                      <ArrowRight className="w-3 h-3 dark:text-dark-muted text-light-muted flex-shrink-0" />
                      <p className="font-semibold dark:text-dark-text text-light-text text-sm truncate">
                        {trip.destination?.address?.split(',').slice(0, 2).join(',')}
                      </p>
                    </div>
                    <p className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
                      {new Date(trip.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · Click to view details
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-3">
                      {[
                        { icon: MapPin, value: formatDistance(trip.summary?.totalDistanceKm), color: 'text-primary' },
                        { icon: Clock, value: formatTime(trip.summary?.totalTripTimeMin), color: 'text-secondary' },
                        { icon: Zap, value: `${trip.summary?.numberOfChargingStops || 0} stops`, color: 'text-emerald-400' },
                        { icon: Route, value: formatCost(trip.summary?.totalCostInr ?? trip.summary?.totalCostUsd), color: 'text-orange-400' },
                      ].map(item => (
                        <div key={item.color} className="flex items-center gap-1.5">
                          <item.icon className={`w-3 h-3 ${item.color}`} />
                          <span className={`text-xs font-semibold ${item.color} stat-number`}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(trip.tripId); }} disabled={deleting === trip.tripId}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-400/10 transition-colors"
                    data-testid="delete-trip-btn"
                  >
                    {deleting === trip.tripId ? <LoadingSpinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => fetchTrips(page - 1)} disabled={page === 1} className="px-3 py-1.5 rounded-lg dark:text-dark-muted text-light-muted border dark:border-dark-border border-light-border disabled:opacity-30 text-sm hover:border-primary/50 transition-colors">Prev</button>
          <span className="text-sm dark:text-dark-muted text-light-muted px-2">Page {page} of {totalPages}</span>
          <button onClick={() => fetchTrips(page + 1)} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg dark:text-dark-muted text-light-muted border dark:border-dark-border border-light-border disabled:opacity-30 text-sm hover:border-primary/50 transition-colors">Next</button>
        </div>
      )}
    </div>
  );
};

export default TripHistoryPage;
