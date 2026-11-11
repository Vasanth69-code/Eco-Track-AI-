const express = require('express');
const router = express.Router();
const { normalize, simulateStream, getCapabilities } = require('../controllers/telemetryController');

router.post('/normalize', normalize);
router.get('/simulate', simulateStream);
router.get('/capabilities/:vehicleId', getCapabilities);

module.exports = router;
