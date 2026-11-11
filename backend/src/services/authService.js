const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/userModel');
const Session = require('../models/vehicleModel');
const { JWT_SECRET, FRONTEND_URL } = require('../config/envConfig');

const generateToken = (user) => {
  return jwt.sign(
    { userId: user.userId, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const registerUser = async (email, name, password) => {
  const existing = await User.findOne({ email });
  if (existing) throw new Error('Email already registered');

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

  const user = await User.create({ userId, email, name, passwordHash, authProvider: 'local' });
  const token = generateToken(user);
  return { token, user: { userId: user.userId, email: user.email, name: user.name, picture: user.picture } };
};

const loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user || !user.passwordHash) throw new Error('Invalid credentials');

  const isValid = await user.comparePassword(password);
  if (!isValid) throw new Error('Invalid credentials');

  const token = generateToken(user);
  return { token, user: { userId: user.userId, email: user.email, name: user.name, picture: user.picture } };
};

// Find or create user for Google OAuth
const findOrCreateUser = async ({ googleId, email, name, picture, authProvider }) => {
  let user = await User.findOne({ email });
  
  if (!user) {
    const userId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    user = await User.create({ 
      userId, 
      email, 
      name, 
      picture, 
      googleId,
      authProvider: 'google' 
    });
  } else {
    // Update existing user with Google info
    user.googleId = googleId;
    user.picture = picture || user.picture;
    user.name = name || user.name;
    user.authProvider = user.authProvider || 'google';
    await user.save();
  }
  
  return user;
};

// Google OAuth callback - generates JWT token after Google auth
const googleAuthSuccess = async (user) => {
  const token = generateToken(user);
  return {
    token,
    user: { userId: user.userId, email: user.email, name: user.name, picture: user.picture }
  };
};

const googleAuthCallback = async (sessionId) => {
  const response = await axios.get('https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data', {
    headers: { 'X-Session-ID': sessionId },
  });

  const { id, email, name, picture, session_token } = response.data;
  let user = await User.findOne({ email });

  if (!user) {
    const userId = `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    user = await User.create({ userId, email, name, picture, authProvider: 'google' });
  } else {
    user.picture = picture;
    user.name = name;
    await user.save();
  }

  // Store session
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await Session.deleteMany({ userId: user.userId });
  await Session.create({ userId: user.userId, sessionToken: session_token, expiresAt });

  const jwtToken = generateToken(user);
  return {
    token: jwtToken,
    sessionToken: session_token,
    user: { userId: user.userId, email: user.email, name: user.name, picture: user.picture },
    expiresAt,
  };
};

const getUserById = async (userId) => {
  return User.findOne({ userId }, { passwordHash: 0, __v: 0 });
};

const updateUserVehicle = async (userId, vehicleData) => {
  return User.findOneAndUpdate({ userId }, { defaultVehicle: vehicleData, updatedAt: new Date() }, { new: true });
};

module.exports = { 
  registerUser, 
  loginUser, 
  googleAuthCallback, 
  googleAuthSuccess,
  findOrCreateUser, 
  getUserById, 
  updateUserVehicle, 
  generateToken,
  FRONTEND_URL 
};
