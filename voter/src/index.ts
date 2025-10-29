import cron from 'node-cron';
import dotenv from 'dotenv';
import { FETCH_SCHEDULE } from './config';
import { startScheduler } from './scheduler';
import { startVotePollingService } from './voter';
import { initializeDatabase } from './db/service';
import { startApiServer } from './api/server';
import { MONGODB_URI, API_PORT } from './config';
import logger from './logger';
import { watchSnapshotEvents, stopSnapshotEvents } from './snapshot_executor';
// Tally executor not needed - scheduler votes directly
// import { watchTallyEvents, stopTallyEvents } from './tally_executor';

dotenv.config();

/**
 * Main application entry point
 */
async function main() {
  try {
    logger.debug('Davos Snapshot Voter service starting...');
    
    // Initialize database
    await initializeDatabase(MONGODB_URI);
    
    // Start the scheduled task to fetch proposals
    startScheduler();
    
    // Start the vote polling service
    startVotePollingService();
    
    // Start API server
    startApiServer(API_PORT);
    
    // Start snapshot executor to watch for on-chain events - disabled: Voting via scheduler
    // await watchSnapshotEvents();
    
    // Tally executor not needed - disabled: Voting via scheduler
    // await watchTallyEvents();
    
    logger.debug('Davos Voter service started successfully');
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
  stopSnapshotEvents();
  // stopTallyEvents(); // Not needed - using direct voting
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM. Shutting down gracefully...');
  stopSnapshotEvents();
  // stopTallyEvents(); // Not needed - using direct voting
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});