import cron from 'node-cron';
import { FETCH_SCHEDULE, DAOS, DELEGATE_CONTRACT_ADDRESS } from './config';
import { fetchProposals, fetchTallyProposals } from './fetcher';
import { processProposalsForVoting } from './voter';
import { getAllActiveSpaces, upsertVoteDetails, hasProposalChanged, getAgentsForSpace } from './db/service';
import { fetchOpenAIResponse } from './ai-parser';
import logger from './logger';
import { publicClient } from './lib/utils';
import DeleGateABI from './artifacts/DeleGate.json';

/**
 * Fetch user ethos from the DeleGate contract
 */
async function getUserEthos(userAddress: string): Promise<string> {
  try {
    const result = await publicClient.readContract({
      address: DELEGATE_CONTRACT_ADDRESS,
      abi: DeleGateABI.abi,
      functionName: 'getUserEthos',
      args: [userAddress as `0x${string}`]
    }) as { ethos: string };
    
    if (result && result.ethos && result.ethos.trim().length > 0) {
      logger.info(`Retrieved ethos for user ${userAddress}: ${result.ethos.substring(0, 50)}...`);
      return result.ethos;
    }
    
    logger.warn(`No ethos found for user ${userAddress}, using default`);
    return "I am a responsible DAO member who values decentralization, transparency, and community governance.";
  } catch (error) {
    logger.error(`Failed to fetch ethos for user ${userAddress}: ${error instanceof Error ? error.message : String(error)}`);
    return "I am a responsible DAO member who values decentralization, transparency, and community governance.";
  }
}

/**
 * Starts the scheduler for fetching proposals and scheduling votes
 */
export function startScheduler(): void {
  // Run immediately on startup
  runFetchAndSchedule();
  
  // Schedule regular runs according to cron pattern
  cron.schedule(FETCH_SCHEDULE, runFetchAndSchedule);
  
  logger.debug(`Scheduler started with cron pattern: ${FETCH_SCHEDULE}`);
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
  logger.debug('Starting proposal fetch and vote scheduling process');
  
  // Process all configured DAOs (both snapshot and tally)
  for (const dao of DAOS) {
    try {
      logger.info(`Processing DAO: ${dao.name} (${dao.id} on ${dao.source})`);
      
      let proposals: any[] = [];
      
      // Fetch proposals based on source type
      if (dao.source === 'tally' && dao.governorAddress) {
        // Check if this DAO has subDaos
        if (dao.subDaos && dao.subDaos.length > 0) {
          logger.info(`Fetching Tally proposals from ${dao.subDaos.length} sub-DAOs`);
          // Fetch from all subDaos and aggregate
          for (const subDao of dao.subDaos) {
            logger.info(`Fetching proposals for ${subDao.name} (${subDao.governorAddress})`);
            const subProposals = await fetchTallyProposals(subDao.governorAddress);
            proposals.push(...subProposals);
            await delay(2000); // Delay between each subDAO fetch
          }
        } else {
          logger.info(`Fetching Tally proposals for governor: ${dao.governorAddress}`);
          proposals = await fetchTallyProposals(dao.governorAddress);
          await delay(2000);
        }
      } else {
        // Default to snapshot or explicit snapshot source
        logger.debug(`Fetching Snapshot proposals for space: ${dao.id}`);
        proposals = await fetchProposals(dao.id);
      }
      
      if (proposals.length === 0) {
        logger.info(`No active proposals found for ${dao.name}`);
        continue;
      }
      
      logger.info(`Found ${proposals.length} proposals for ${dao.name}`);
      
      // Get all agents for this space to save vote details for each user
      logger.warn(`Fetching agents for space: ${dao.id}`);
      const agentsForSpace = await getAgentsForSpace(dao.id);
      logger.warn(agentsForSpace.length);
      const agentAddresses = [...new Set(agentsForSpace.map(a => a.agent.address).filter(Boolean))];
      
      logger.info(`Found ${agentAddresses.length} unique agents for space ${dao.id}`);
      
      // Process vote details for each agent
      for (const agentData of agentsForSpace) {
        const agentAddress = agentData.agent.address;
        const userAddress = agentData.agent.userAddress;

        if (!agentAddress || !userAddress) {
          logger.warn(`No userAddress found for agent ${agentAddress}, skipping`);
          continue;
        }

        // Fetch user ethos from DeleGate contract if userAddress is available
        const userEthos = await getUserEthos(userAddress);

        if (userEthos.length < 2) {
          logger.warn(`No user ethos found for user ${userAddress}, skipping`);
          continue;
        }
        
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
              agentAddress,
              userEthos,
              normalizedProposal.id,
              normalizedProposal.body,
              normalizedProposal.end
            );
            
            if (hasChanged) {
              // Generate AI response for this proposal
              const directive = process.env.AI_DIRECTIVE || "Suggest a vote for the passed proposal based on the ethos of the user. The result must be only a JSON with two elements: 'vote', which can be yes or no, and 'reason', which is the explanation of the reasons considered for the voting decision. The JSON must be formatted as follows: {\"vote\": \"yes\", \"reason\": \"...\"}.";
              
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
                agentAddress,
                normalizedProposal.id,
                dao.id,
                normalizedProposal.title,
                normalizedProposal.body,
                normalizedProposal.end,
                reasoning,
                aiVoteChoice,
                userEthos,
                userAddress
              );
              
              logger.info(`Saved vote details for agent ${agentAddress}, proposal ${normalizedProposal.id}`);
            } else {
              logger.info(`Proposal ${normalizedProposal.id} unchanged for agent ${agentAddress}, skipping update`);
            }
          } catch (error) {
            logger.error(`Error processing proposal ${normalizedProposal.id} for agent ${agentAddress}: ${error instanceof Error ? error.message : String(error)}`);
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