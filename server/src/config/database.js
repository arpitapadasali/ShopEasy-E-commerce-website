import mongoose from 'mongoose';
import { config } from './env.js';

let isIntentionalDisconnect = false;
let memoryServerInstance = null;

// Never buffer commands when disconnected so queries fail fast rather than hanging
mongoose.set('bufferCommands', false);

/**
 * Mask credentials in MongoDB connection string for safe logging
 * Replaces password with '****' to prevent sensitive data leakage
 */
export const sanitizeMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@)/i, '$1****$3');
};

/**
 * Establish a resilient connection to MongoDB Atlas (with automatic local dev fallback)
 */
export const connectDatabase = async (customUri) => {
  const uri = customUri || process.env.TEST_MONGODB_URI || config.mongodbUri;
  isIntentionalDisconnect = false;

  if (!uri) {
    const errorMsg = '[Database] Error: MONGODB_URI is not defined in server/.env. Please provide a valid MongoDB Atlas connection string.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Validate Atlas URI format
  if (!uri.startsWith('mongodb+srv://') && !uri.startsWith('mongodb://')) {
    const errorMsg = '[Database] Error: Invalid MONGODB_URI format. Must start with mongodb+srv:// (Atlas) or mongodb://';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    const sanitizedUri = sanitizeMongoUri(uri);
    console.log(`[Database] Connecting to MongoDB Atlas cluster at: ${sanitizedUri}`);

    const conn = await mongoose.connect(uri, {
      autoIndex: true, // Build indexes in development
      serverSelectionTimeoutMS: 5000, // Timeout after 5s if cannot reach Atlas cluster
      socketTimeoutMS: 30000,
    });

    console.log(`[Database] Successfully connected to MongoDB Atlas! Host: ${conn.connection.host}`);
    return mongoose.connection;
  } catch (error) {
    // Provide explicit troubleshooting hints based on common Atlas connection issues
    let diagnosticHint = '';
    const isTlsAlert80 = error.message && error.message.includes('SSL alert number 80');
    const isServerSelection =
      error.name === 'MongoServerSelectionError' ||
      error.name === 'MongooseServerSelectionError';

    if (isTlsAlert80 || isServerSelection) {
      diagnosticHint =
        'The Atlas cluster rejected connection (TLS alert 80 / ServerSelectionError). This occurs when your current public IP is not in Atlas Network Access whitelist.';
    } else if (error.message && error.message.includes('bad auth')) {
      diagnosticHint =
        'Authentication failed. Verify your database username and password in MongoDB Atlas Database Access (ensure no unescaped special characters).';
    }

    console.error(`[Database] Connection Error: ${error.name} - ${error.message}`);
    if (diagnosticHint) {
      console.error(`[Database] Troubleshooting: ${diagnosticHint}`);
      console.error(`[Database] Atlas Fix: Go to cloud.mongodb.com > Network Access > Add IP Address > Allow Access from Anywhere (0.0.0.0/0).`);
    }

    // In local development, if cloud Atlas is unreachable (e.g. IP not whitelisted or offline),
    // automatically activate the local embedded MongoDB server so developers are not blocked from logging in.
    if (config.nodeEnv === 'development' && !customUri && !process.env.TEST_MONGODB_URI) {
      console.log(`\n[Database] ====================================================`);
      console.log(`[Database] Activating local development database fallback...`);
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        if (!memoryServerInstance) {
          memoryServerInstance = await MongoMemoryServer.create();
        }
        const memUri = memoryServerInstance.getUri();
        console.log(`[Database] Connecting to local development MongoDB instance...`);
        const fallbackConn = await mongoose.connect(memUri, {
          autoIndex: true,
          serverSelectionTimeoutMS: 5000,
        });

        console.log(`[Database] Connected to local development MongoDB!`);
        console.log(`[Database] Note: Active with local database until Atlas IP whitelist is updated.`);

        // Auto-seed development admin and sample customer accounts
        try {
          const { seedCatalogAndUsers } = await import('../scripts/seedDatabase.js');
          await seedCatalogAndUsers(true);
          console.log(`[Database] Default accounts ready:`);
          console.log(`           Admin:    admin@shopeasy.local  /  AdminSecurePass123!`);
          console.log(`           Customer: customer@shopeasy.local / CustomerPass123!`);
        } catch (seedErr) {
          console.warn(`[Database] Auto-seed warning: ${seedErr.message}`);
        }

        console.log(`[Database] ====================================================\n`);
        return mongoose.connection;
      } catch (fallbackErr) {
        console.error(`[Database] Local development database fallback failed: ${fallbackErr.message}`);
      }
    }

    throw error;
  }
};

/**
 * Gracefully close database connection
 */
export const disconnectDatabase = async () => {
  try {
    isIntentionalDisconnect = true;
    await mongoose.disconnect();
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
      memoryServerInstance = null;
    }
    console.log('[Database] MongoDB connection closed cleanly.');
  } catch (error) {
    console.error(`[Database] Disconnect error: ${error.message}`);
  }
};

// Mongoose Connection Event Listeners
mongoose.connection.on('disconnected', () => {
  if (!isIntentionalDisconnect) {
    console.warn('[Database] Mongoose connection lost unexpectedly.');
  }
});

mongoose.connection.on('error', (err) => {
  console.error(`[Database] Mongoose runtime error: ${err.message}`);
});

export default connectDatabase;
