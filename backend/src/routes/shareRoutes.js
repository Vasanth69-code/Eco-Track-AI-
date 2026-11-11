const express = require('express');
const router = express.Router();
const { createShare, getShare } = require('../controllers/shareController');
const authMiddleware = require('../middlewares/authMiddleware');

// Create share link (auth required)
router.post('/', authMiddleware, createShare);

// Get shared trip (public — no auth)
router.get('/:token', getShare);

module.exports = router;
