import cron from 'node-cron';
import { FETCH_SCHEDULE, DAOS } from './config';
import { fetchProposals, fetchTallyProposals } from './fetcher';
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
 * Delay helper to add pauses between API calls
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main process to fetch proposals and schedule votes
 */
export async function runFetchAndSchedule(): Promise<void> {
  logger.info('Starting proposal fetch and vote scheduling process');
  
  // Process all configured DAOs (both snapshot and tally)
  for (const dao of DAOS) {
    try {
      logger.info(`Processing DAO: ${dao.name} (${dao.id})`);
      
      let proposals: any[] = [];
      
      // Fetch proposals based on source type
      if (dao.source === 'tally' && dao.governorAddress) {
        logger.info(`Fetching Tally proposals for governor: ${dao.governorAddress}`);
        proposals = await fetchTallyProposals(dao.governorAddress);
        // Add delay after Tally API calls to avoid rate limiting
        await delay(2000);
      } else {
        // Default to snapshot or explicit snapshot source
        logger.info(`Fetching Snapshot proposals for space: ${dao.id}`);
        proposals = await fetchProposals(dao.id);
      }
      
      if (proposals.length === 0) {
        logger.info(`No active proposals found for ${dao.name}`);
        continue;
      }
      
      logger.info(`Found ${proposals.length} proposals for ${dao.name}`);
      
      // Get all agents for this space to save vote details for each user
      const agentsForSpace = await getAgentsForSpace(dao.id);
      const userAddresses = [...new Set(agentsForSpace.map(a => a.agent.userAddress).filter(Boolean))];
      
      logger.info(`Found ${userAddresses.length} unique users for space ${dao.id}`);
      
      // Process vote details for each user
      for (const userAddress of userAddresses) {
        if (!userAddress) continue;
        
        for (const proposal of proposals) {
          // Normalize proposal data between Snapshot and Tally formats
          const normalizedProposal = dao.source === 'tally' ? {
            id: proposal.id,
            title: proposal.title,
            body: proposal.body,
            end: proposal.endBlock, // Tally uses endBlock instead of end
          } : proposal; // Snapshot proposal is already in correct format
          
          try {
            // Check if proposal has changed
            const hasChanged = await hasProposalChanged(
              userAddress,
              normalizedProposal.id,
              normalizedProposal.body,
              normalizedProposal.end
            );
            
            if (hasChanged) {
              // Generate AI response for this proposal
              const directive = "Suggest a vote for the passed proposal based on the ethos of the user. The result must be only a JSON with two elements: 'vote', which can be yes or no, and 'reason', which is the explanation of the reasons considered for the voting decision. The JSON must be formatted as follows: {\"vote\": \"yes\", \"reason\": \"...\"}.";
              
              // For now, we'll use a generic ethos. In the future, this should be fetched from user profile
              const userEthos = "I am a responsible DAO member who values decentralization, transparency, and community governance.";
              
              const aiResponse = await fetchOpenAIResponse(
                `This is the user ethos: ${userEthos}. ${directive}`,
                normalizedProposal.body
              );
              
              // Parse AI response
              let aiVoteChoice: 'yes' | 'no' = 'no'; // default
              let reasoning = aiResponse;
              
              try {
                const parsed = JSON.parse(aiResponse);
                aiVoteChoice = parsed.vote === 'yes' ? 'yes' : 'no';
                reasoning = parsed.reason || aiResponse;
              } catch (parseError) {
                logger.warn(`Failed to parse AI response as JSON for proposal ${normalizedProposal.id}: ${parseError}`);
              }
              
              // Save vote details
              await upsertVoteDetails(
                userAddress,
                normalizedProposal.id,
                dao.id,
                normalizedProposal.title,
                normalizedProposal.body,
                normalizedProposal.end,
                reasoning,
                aiVoteChoice
              );
              
              logger.info(`Saved vote details for user ${userAddress}, proposal ${normalizedProposal.id}`);
            } else {
              logger.info(`Proposal ${normalizedProposal.id} unchanged for user ${userAddress}, skipping update`);
            }
          } catch (error) {
            logger.error(`Error processing proposal ${normalizedProposal.id} for user ${userAddress}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
      
      // Process proposals for voting at the right time
      // Pass source and governorAddress for Tally proposals, defaults to snapshot for backwards compatibility
      await processProposalsForVoting(
        proposals, 
        dao.id, 
        dao.source || 'snapshot',
        dao.governorAddress
      );
    } catch (error) {
      logger.error(`Error processing ${dao.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  logger.info('Proposal fetch and vote scheduling process completed');
}