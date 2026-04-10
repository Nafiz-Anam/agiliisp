import { createServer, Server } from 'http';
import app from './app';
import prisma from './client';
import config from './config/config';
import logger from './config/logger';
import tokenCleanupService from './services/tokenCleanup.service';
import ispSchedulerService from './services/ispScheduler.service';
import { initializeSocket } from './controllers/websocket.controller';
import { initializeTracing } from './utils/tracing';

// Initialize OpenTelemetry tracing
initializeTracing();

logger.debug('Starting application initialization...');

let server: Server;
prisma
  .$connect()
  .then(() => {
    logger.info('Connected to SQL Database');
    logger.debug('Attempting to start HTTP server...');

    // Create HTTP server and attach Socket.io
    server = createServer(app);
    initializeSocket(server);

    server.listen(config.port, () => {
      logger.info(`Listening to port ${config.port}`);
      logger.info(`🚀 API Server running at http://localhost:${config.port}`);
      logger.info(`📚 API Documentation available at http://localhost:${config.port}/v1/docs`);
      logger.info(`🔌 Socket.io attached to HTTP server on port ${config.port}`);
      logger.debug('Server started successfully');

      // Schedule token cleanup to run every 15 minutes
      tokenCleanupService.scheduleTokenCleanup(15);

      // Start ISP automation schedulers (billing, auto-suspend)
      ispSchedulerService.startISPSchedulers();

      // Start connection monitor (PPPoE state tracking for compliance)
      import('./services/connectionMonitor.service').then(m => m.default.startPolling()).catch(() => {});

      // Start RADIUS accounting listener (if enabled)
      import('./services/radius.service').then(m => m.default.startServer()).catch(() => {});
    });
  })
  .catch((error: Error) => {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  });

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error: unknown) => {
  logger.error(error);
  // Only exit on critical errors, not on SMTP or non-critical issues
  if (
    error instanceof Error &&
    (error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('SMTP') ||
      error.message.includes('email'))
  ) {
    // Don't exit on SMTP/email related errors
    logger.warn('Non-critical error detected, server will continue running');
    return;
  }
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});
