import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Initialize Express application
const app = express();

// Security HTTP headers
app.use(helmet());

// Controlled CORS policy
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      config.clientUrl,
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ];

    if (allowedOrigins.indexOf(origin) !== -1 || !config.isProduction) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: Access denied for this origin.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// HTTP Request Logger
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Request Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '10mb' }));

// Mount API routes under /api
app.use('/api', apiRouter);

// Catch-all 404 handler for unknown routes
app.use(notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

export default app;
