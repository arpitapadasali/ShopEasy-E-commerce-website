import app from './app.js';
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

const PORT = config.port;

// Start HTTP server and attempt database connection if URI configured
const startServer = async () => {
  const server = app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(` ShopEasy API Server Running`);
    console.log(` Port:        http://localhost:${PORT}`);
    console.log(` Health:      http://localhost:${PORT}/api/health`);
    console.log(` Environment: ${config.nodeEnv}`);
    console.log(` Stage:       Stage 3 (Authentication & Authorization)`);
    console.log(`=========================================`);
  });

  // Attempt database connection if configured
  if (config.mongodbUri) {
    try {
      await connectDatabase();
    } catch (err) {
      console.warn(`[Server] Continuing startup despite database connection issue. Health endpoint is active.`);
    }
  } else {
    console.log(`[Database] MONGODB_URI not configured in server/.env. Database remains unconfigured.`);
  }

  // Handle graceful shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Gracefully shutting down...`);
    await disconnectDatabase();
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return server;
};

const serverInstance = startServer();

export default serverInstance;
