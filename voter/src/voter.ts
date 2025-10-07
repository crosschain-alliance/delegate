import { SnapshotProposal } from './types';
import { RPC_URL, VOTE_HOURS_BEFORE_END, DELEGATE_CONTRACT_ADDRESS, VOTE_POLLER_INTERVAL } from './config';
import { getAgentsForSpace, scheduleVoteInDb, getPendingVotes, markVoteCompleted, markVoteFailed } from './db/service';
import logger from './logger';
import { IAgent } from './db/models';
import { publicClient, walletClient } from './lib/utils';
import { sepolia } from 'viem/chains';
import DeleGateABI from './artifacts/DeleGate.json';

/**
 * Processes proposals and schedules votes at the appropriate time
 */
export async function processProposalsForVoting(
  proposals: SnapshotProposal[],
  spaceId: string
): Promise<void> {
  logger.info(`Processing ${proposals.length} proposals for ${spaceId}`);
  
  // Get all agents for this space
  const agentsForSpace = await getAgentsForSpace(spaceId);
  
  if (agentsForSpace.length === 0) {
    logger.warn(`No agents found for space ${spaceId}, skipping proposals`);
    return;
  }
  
  logger.info(`Found ${agentsForSpace.length} agents for space ${spaceId}`);
  
  for (const proposal of proposals) {
    try {
      // Calculate when to vote (VOTE_HOURS_BEFORE_END hours before proposal ends)
      const proposalEndTimeMs = proposal.end * 1000; // Convert to milliseconds
      const voteTimeMs = proposalEndTimeMs - (VOTE_HOURS_BEFORE_END * 60 * 60 * 1000);
      const currentTimeMs = Date.now();
      
      // Format dates for logging
      const endTimeFormatted = new Date(proposalEndTimeMs).toISOString();
      const voteTimeFormatted = new Date(voteTimeMs).toISOString();
      
      logger.info(`Proposal: ${proposal.title} (${proposal.id})`);
      logger.info(`  End time: ${endTimeFormatted}`);
      logger.info(`  Target vote time: ${voteTimeFormatted}`);
      
      // For each agent, schedule a vote
      for (const { agent } of agentsForSpace) {
        if (voteTimeMs <= currentTimeMs) {
          // If vote time has already passed but proposal hasn't ended, vote now
          if (currentTimeMs < proposalEndTimeMs) {
            logger.info(`  Vote time already passed, voting immediately for agent ${agent.name}`);
            await castVote(proposal, agent.address, agent.privateKey);
          } else {
            logger.info(`  Proposal has already ended, skipping for agent ${agent.name}`);
          }
        } else {
          // Schedule the vote in the database for the future
          const scheduledTime = new Date(voteTimeMs);
          const delayMinutes = Math.round((voteTimeMs - currentTimeMs) / (60 * 1000));
          
          logger.info(`  Scheduling vote in ${delayMinutes} minutes for agent ${agent.name}`);
          await scheduleVoteInDb(proposal, agent, scheduledTime);
        }
      }
    } catch (error) {
      logger.error(`Failed to process proposal ${proposal.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Starts a polling service to check for and execute pending votes
 */
export function startVotePollingService(): void {
  logger.info('Starting vote polling service');
  
  // Check for pending votes every minute (or configure as needed)
  setInterval(async () => {
    await executeScheduledVotes();
  }, VOTE_POLLER_INTERVAL);
  
  // Execute immediately on startup
  executeScheduledVotes().catch(err => {
    logger.error(`Error on initial vote execution: ${err}`);
  });
}

/**
 * Executes all pending scheduled votes
 */
async function executeScheduledVotes(): Promise<void> {
  const pendingVotes = await getPendingVotes();
  
  if (pendingVotes.length === 0) {
    return;
  }
  
  logger.info(`Found ${pendingVotes.length} pending votes to execute`);
  
  for (const vote of pendingVotes) {
    try {
      const agent = vote.agentId as unknown as IAgent;

      if (!agent.userAddress) {
        throw new Error(`Agent not found for vote ${vote._id}`);
      }
      
      logger.info(`Executing scheduled vote for proposal: ${vote.proposalTitle} (${vote.proposalId}) for agent ${agent.name}`);
      
      // Create a simplified proposal object with the necessary information
      const proposal: SnapshotProposal = {
        id: vote.proposalId,
        title: vote.proposalTitle,
        space: {
          id: vote.spaceId,
          name: vote.spaceId, // We don't store the space name in the scheduled vote
        }
      } as SnapshotProposal;
      
      await castVote(proposal, agent.address, agent.userAddress);
      await markVoteCompleted((vote._id as any).toString());
      
      logger.info(`Vote for proposal ${vote.proposalId} successfully executed`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to execute vote: ${errorMessage}`);
      await markVoteFailed((vote._id as any).toString(), errorMessage);
    }
  }
}

/**
 * Casts a vote on a proposal using the DeleGate contract
 */
export async function castVote(
  proposal: SnapshotProposal,
  agentAddress: string,
  userAddress: string,
): Promise<void> {
  try {


    logger.info(`Casting vote for proposal: ${proposal.title} (${proposal.id}) with agent ${agentAddress} for the user ${userAddress}`);

    console.info(`Agent address: ${agentAddress}`);
    console.info(`User address: ${userAddress}`);

    const hash = await walletClient.writeContract({
      address: DELEGATE_CONTRACT_ADDRESS,
      abi: DeleGateABI.abi,
      functionName: 'castSpaceVoteFor',
      args: [
        userAddress,
        sepolia.id,
        proposal.space.id,
        BigInt(proposal.id),
        proposal.body,
        agentAddress,
        "0x" // voteProof (empty for now) 
      ],
    });

    
    logger.info(`Vote transaction submitted: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: hash });
    logger.info(`Vote transaction confirmed in block ${receipt.blockNumber}: ${hash}`);
  } catch (error) {
    logger.error(`Vote failed for proposal ${proposal.id}: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}