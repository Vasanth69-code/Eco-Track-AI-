const express = require('express');
const router = express.Router();
const { createTrip, getTrips, getTrip, removeTrip, getStats } = require('../controllers/tripController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);
router.post('/', createTrip);
router.get('/', getTrips);
router.get('/stats', getStats);
router.get('/:id', getTrip);
router.delete('/:id', removeTrip);

module.exports = router;
