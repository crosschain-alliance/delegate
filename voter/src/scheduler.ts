import cron from 'node-cron';
import { FETCH_SCHEDULE } from './config';
import { fetchProposals } from './fetcher';
import { processProposalsForVoting } from './voter';
import { getAllActiveSpaces, upsertVoteDetails, hasProposalChanged, getAgentsForSpace } from './db/service';
import { fetchOpenAIResponse } from './ai-parser';
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
      
      // Get all agents for this space to save vote details for each user
      const agentsForSpace = await getAgentsForSpace(spaceId);
      const userAddresses = [...new Set(agentsForSpace.map(a => a.agent.userAddress).filter(Boolean))];
      
      logger.info(`Found ${userAddresses.length} unique users for space ${spaceId}`);
      
      // Process vote details for each user
      for (const userAddress of userAddresses) {
        if (!userAddress) continue;
        
        for (const proposal of proposals) {
          try {
            // Check if proposal has changed
            const hasChanged = await hasProposalChanged(
              userAddress,
              proposal.id,
              proposal.body,
              proposal.end
            );
            
            if (hasChanged) {
              // Generate AI response for this proposal
              const directive = "Suggest a vote for the passed proposal based on the ethos of the user. The result must be only a JSON with two elements: 'vote', which can be yes or no, and 'reason', which is the explanation of the reasons considered for the voting decision. The JSON must be formatted as follows: {\"vote\": \"yes\", \"reason\": \"...\"}.";
              
              // For now, we'll use a generic ethos. In the future, this should be fetched from user profile
              const userEthos = "I am a responsible DAO member who values decentralization, transparency, and community governance.";
              
              const aiResponse = await fetchOpenAIResponse(
                `This is the user ethos: ${userEthos}. ${directive}`,
                proposal.body
              );
              
              // Parse AI response
              let aiVoteChoice: 'yes' | 'no' = 'no'; // default
              let reasoning = aiResponse;
              
              try {
                const parsed = JSON.parse(aiResponse);
                aiVoteChoice = parsed.vote === 'yes' ? 'yes' : 'no';
                reasoning = parsed.reason || aiResponse;
              } catch (parseError) {
                logger.warn(`Failed to parse AI response as JSON for proposal ${proposal.id}: ${parseError}`);
              }
              
              // Save vote details
              await upsertVoteDetails(
                userAddress,
                proposal.id,
                spaceId,
                proposal.title,
                proposal.body,
                proposal.end,
                reasoning,
                aiVoteChoice
              );
              
              logger.info(`Saved vote details for user ${userAddress}, proposal ${proposal.id}`);
            } else {
              logger.info(`Proposal ${proposal.id} unchanged for user ${userAddress}, skipping update`);
            }
          } catch (error) {
            logger.error(`Error processing proposal ${proposal.id} for user ${userAddress}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
      
      // Process proposals for voting at the right time
      await processProposalsForVoting(proposals, spaceId);
    } catch (error) {
      logger.error(`Error processing ${spaceId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  logger.info('Proposal fetch and vote scheduling process completed');
}