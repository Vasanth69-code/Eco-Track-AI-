export const formatDistance = (km) => {
  if (!km && km !== 0) return '—';
  return km >= 1000 ? `${(km / 1000).toFixed(1)} Mm` : `${km.toFixed(1)} km`;
};

export const formatTime = (minutes) => {
  if (!minutes && minutes !== 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

export const formatEnergy = (kwh) => {
  if (!kwh && kwh !== 0) return '—';
  return `${kwh.toFixed(1)} kWh`;
};

export const formatCost = (amount) => {
  if (!amount && amount !== 0) return '—';
  return `₹${amount.toFixed(2)}`;
};

export const formatSoC = (pct) => {
  if (!pct && pct !== 0) return '—';
  return `${pct.toFixed(1)}%`;
};

export const getSoCColor = (pct) => {
  if (pct >= 60) return '#00F0FF';
  if (pct >= 30) return '#CCFF00';
  if (pct >= 15) return '#FF9500';
  return '#FF3B30';
};

export const getTrafficColor = (level) => {
  const colors = { free: '#34D399', light: '#00F0FF', moderate: '#CCFF00', heavy: '#FF9500', congested: '#FF3B30' };
  return colors[level] || '#94A3B8';
};

export const truncate = (str, n = 50) => {
  if (!str) return '';
  return str.length > n ? `${str.substring(0, n)}...` : str;
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};
