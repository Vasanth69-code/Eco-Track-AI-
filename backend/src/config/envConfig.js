const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

module.exports = {
  PORT: process.env.PORT || 5500,
  MONGO_URL: process.env.MONGO_URL,
  DB_NAME: process.env.DB_NAME,
  JWT_SECRET: process.env.JWT_SECRET || 'voltpath-secret-key-change-in-production',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5500/api/auth/google/callback',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  OPEN_CHARGE_MAP_API_KEY: process.env.OPEN_CHARGE_MAP_API_KEY,
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
  TOMTOM_API_KEY: process.env.TOMTOM_API_KEY,
  NODE_ENV: process.env.NODE_ENV || 'development',
};
