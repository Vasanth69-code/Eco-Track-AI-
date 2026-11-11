import React from 'react';
import { motion } from 'framer-motion';
import { staggerItem } from '../../animations/variants';

const StatCard = ({ icon: Icon, label, value, unit, trend, trendUp, color = 'primary', delay = 0 }) => {
  const colors = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    green: 'text-emerald-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
  };

  return (
    <motion.div
      variants={staggerItem}
      initial="initial"
      animate="animate"
      transition={{ delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="dark:bg-dark-surface bg-white border dark:border-dark-border border-light-border rounded-2xl p-5 cursor-default group hover:border-primary/40 transition-all duration-300"
      data-testid="stat-card"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color === 'primary' ? 'bg-primary/10' : color === 'secondary' ? 'bg-secondary/10' : 'bg-emerald-400/10'}`}>
          {Icon && <Icon className={`w-5 h-5 ${colors[color]}`} />}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendUp ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
            {trendUp ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="stat-number text-2xl font-bold dark:text-dark-text text-light-text mb-1">
        {value}<span className="text-sm font-medium dark:text-dark-muted text-light-muted ml-1">{unit}</span>
      </div>
      <p className="text-sm dark:text-dark-muted text-light-muted">{label}</p>
    </motion.div>
  );
};

export default StatCard;
