const express = require('express');
const router = express.Router();
const { weatherSimulation, trafficSimulation, batteryDegradation } = require('../controllers/simulationController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/weather', authMiddleware, weatherSimulation);
router.post('/traffic', authMiddleware, trafficSimulation);
router.post('/battery-degradation', authMiddleware, batteryDegradation);

module.exports = router;
