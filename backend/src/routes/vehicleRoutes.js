const express = require('express');
const router = express.Router();
const { getAllVehicles, getVehicleById } = require('../controllers/vehicleController');

router.get('/', getAllVehicles);
router.get('/:id', getVehicleById);

module.exports = router;
