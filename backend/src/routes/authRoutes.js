const express = require('express');
const router = express.Router();
const passport = require('passport');
const { register, login, googleSession, getMe, updateVehicle, logout, googleAuth, googleCallback } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/login', login);

// Google OAuth routes
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(200).json({ success: false, message: 'Google Auth is disabled.' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.redirect((process.env.FRONTEND_URL || 'http://localhost:5173') + '/dashboard');
  }
  passport.authenticate('google', { session: false, failureRedirect: '/dashboard' })(req, res, () => {
    googleCallback(req, res);
  });
});

// Legacy session-based Google auth (for Emergent AI compatibility)
router.post('/google/session', googleSession);

router.get('/me', authMiddleware, getMe);
router.put('/vehicle', authMiddleware, updateVehicle);
router.post('/logout', authMiddleware, logout);

module.exports = router;
