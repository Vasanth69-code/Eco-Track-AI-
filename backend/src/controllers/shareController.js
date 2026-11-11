const crypto = require('crypto');
const { success, error } = require('../utils/responseHelper');

// In-memory shares store
const inMemoryShares = new Map();

// POST /api/share — create share link (zero DB required)
const createShare = async (req, res) => {
  try {
    const { tripData, vehicle, expiryDays = 7 } = req.body;
    if (!tripData) return error(res, 'Trip data is required', 400);

    const token = crypto.randomBytes(10).toString('hex');
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const share = {
      token,
      tripData,
      vehicle,
      createdBy: req.user?.userId || 'ecotrack_driver',
      expiresAt,
      viewCount: 0,
      createdAt: new Date().toISOString(),
    };

    inMemoryShares.set(token, share);

    return success(res, { token, expiresAt, shareUrl: `/share/${token}` }, 'Share link created');
  } catch (err) {
    return error(res, `Failed to create share: ${err.message}`, 500);
  }
};

// GET /api/share/:token — public access
const getShare = async (req, res) => {
  try {
    const token = req.params.token;
    const share = inMemoryShares.get(token);

    if (!share) return error(res, 'Share link not found or expired', 404);
    if (new Date(share.expiresAt) < new Date()) {
      inMemoryShares.delete(token);
      return error(res, 'Share link has expired', 410);
    }

    share.viewCount += 1;

    return success(res, {
      tripData: share.tripData,
      vehicle: share.vehicle,
      token: share.token,
      expiresAt: share.expiresAt,
      viewCount: share.viewCount,
      createdAt: share.createdAt,
    }, 'Share retrieved');
  } catch (err) {
    return error(res, `Failed to retrieve share: ${err.message}`, 500);
  }
};

module.exports = { createShare, getShare };
