import mongoose from 'mongoose';
import { config } from '../config/env.js';

const getDatabaseStatus = () => {
  switch (mongoose.connection.readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return config.mongodbUri ? 'disconnected' : 'unconfigured';
  }
};

/**
 * Controller for GET /api/health
 * Returns service status, system uptime, and database connection state
 */
export const getHealth = (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ShopEasy API',
    stage: 'Stage 3: Authentication & Authorization Active',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    environment: config.nodeEnv,
    database: getDatabaseStatus(),
  });
};

export default getHealth;
