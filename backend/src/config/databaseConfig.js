/**
 * Database Configuration for EcoTrack AI
 * Zero-DB mode: All trip management, vehicles, shares, and analytics run
 * completely in-memory with zero MongoDB connection requirement.
 */

const connectDB = async () => {
  console.log('⚡ [EcoTrack AI] Running in zero-DB mode. In-memory data store active.');
  return Promise.resolve();
};

module.exports = connectDB;
