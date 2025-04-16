import cron from 'node-cron';
import dotenv from 'dotenv';
import { FETCH_SCHEDULE } from './config';
import { startScheduler } from './scheduler';
import { startApiServer } from './api/server';
import { initializeDatabase } from './db/service';
import logger from './logger';

dotenv.config();

// Get database connection string from environment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/davos-voter';
const API_PORT = parseInt(process.env.API_PORT || '3000', 10);

/**
 * Main application entry point
 */
async function main() {
  try {
    logger.info('Davos Snapshot Voter service starting...');
    
    // Initialize the database
    await initializeDatabase(MONGODB_URI);
    
    // Start the API server
    startApiServer(API_PORT);
    
    // Start the proposal scheduler
    startScheduler();
    
    logger.info('Service initialized successfully');
  } catch (error) {
    logger.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Run the application
main();

// Handle termination signals
process.on('SIGINT', () => {
  logger.info('Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});