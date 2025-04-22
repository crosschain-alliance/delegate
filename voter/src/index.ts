import cron from 'node-cron';
import dotenv from 'dotenv';
import { FETCH_SCHEDULE } from './config';
import { startScheduler } from './scheduler';
import { startVotePollingService } from './voter';
import { initializeDatabase } from './db/service';
import { startApiServer } from './api/server';
import { MONGODB_URI, API_PORT } from './config';
import logger from './logger';

dotenv.config();

/**
 * Main application entry point
 */
async function main() {
  try {
    logger.info('Davos Snapshot Voter service starting...');
    
    // Initialize database
    await initializeDatabase(MONGODB_URI);
    
    // Start the scheduled task to fetch proposals
    startScheduler();
    
    // Start the vote polling service
    startVotePollingService();
    
    // Start API server
    startApiServer(API_PORT);
    
    logger.info('Davos Voter service started successfully');
  } catch (error) {
    logger.error(`Failed to start service: ${error instanceof Error ? error.message : String(error)}`);
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