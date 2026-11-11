const express = require('express');
const router = express.Router();
const { calculateRoute, geocode, autocomplete } = require('../controllers/routeController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/calculate', authMiddleware, calculateRoute);
router.get('/geocode', geocode);
router.get('/autocomplete', autocomplete);

module.exports = router;
