import axios from 'axios';
import { API_BASE } from '../config/constants';

const api = axios.create({ baseURL: API_BASE, withCredentials: true, timeout: 60000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ecotrack_token') || localStorage.getItem('voltpath_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    return Promise.reject(err);
  }
);

export default api;
