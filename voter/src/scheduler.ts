import cron from 'node-cron';
import { FETCH_SCHEDULE } from './config';
import { fetchProposals } from './fetcher';
import { processProposalsForVoting } from './voter';
import { getAllActiveSpaces } from './db/service';
import logger from './logger';

/**
 * Starts the scheduler for fetching proposals and scheduling votes
 */
export function startScheduler(): void {
  // Run immediately on startup
  runFetchAndSchedule();
  
  // Schedule regular runs according to cron pattern
  cron.schedule(FETCH_SCHEDULE, runFetchAndSchedule);
  
  logger.info(`Scheduler started with cron pattern: ${FETCH_SCHEDULE}`);
}

/**
 * Main process to fetch proposals and schedule votes
 */
export async function runFetchAndSchedule(): Promise<void> {
  logger.info('Starting proposal fetch and vote scheduling process');
  
  // Get all active spaces from the database
  const activeSpaces = await getAllActiveSpaces();
  
  if (activeSpaces.length === 0) {
    logger.warn('No active spaces found in the database');
    return;
  }
  
  logger.info(`Found ${activeSpaces.length} active spaces`);
  
  // Process each space
  for (const spaceId of activeSpaces) {
    try {
      logger.info(`Fetching proposals for space: ${spaceId}`);
      const proposals = await fetchProposals(spaceId);
      
      if (proposals.length === 0) {
        logger.info(`No active proposals found for ${spaceId}`);
        continue;
      }
      
      // Filter proposals ending within the next 24 hours
      // const relevantProposals = filterProposalsEndingWithin24Hours(proposals);
      
      // if (relevantProposals.length === 0) {
      //   logger.info(`No proposals ending within 24 hours for ${spaceId}`);
      //   continue;
      // }
      
      // Process proposals for voting at the right time
      await processProposalsForVoting(proposals, spaceId);
    } catch (error) {
      logger.error(`Error processing ${spaceId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  logger.info('Proposal fetch and vote scheduling process completed');
}