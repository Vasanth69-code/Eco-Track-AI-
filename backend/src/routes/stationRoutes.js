const express = require('express');
const router = express.Router();
const { getStations, getStationsByBbox, getStationsCorridor } = require('../controllers/stationController');

// Bounding box query for visible map view
router.get('/bbox', getStationsByBbox);

// Route corridor query
router.post('/corridor', getStationsCorridor);

// Radius/point query
router.get('/', getStations);

module.exports = router;
