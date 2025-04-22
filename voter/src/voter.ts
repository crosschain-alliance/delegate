import { ethers } from 'ethers';
import { SnapshotProposal } from './types';
import { RPC_URL, VOTE_HOURS_BEFORE_END, DELEGATE_CONTRACT_ADDRESS, VOTE_POLLER_INTERVAL } from './config';
import { getAgentsForSpace, scheduleVoteInDb, getPendingVotes, markVoteCompleted, markVoteFailed } from './db/service';
import logger from './logger';
import { IAgent } from './db/models';

// ABI for the DeleGate contract's castSpaceVoteFor function
const CONTRACT_ABI = [
  "function castSpaceVoteFor(address voter, uint256 targetChainId, string calldata space, uint256 proposalId, string calldata vote, address module, bytes calldata voteProof) external"
];

// Module address for the DeleGate contract
const MODULE_ADDRESS = "0x089766e1b6aa704582959aE3B0B647738367911e";

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
      for (const { agent, defaultVote } of agentsForSpace) {
        if (voteTimeMs <= currentTimeMs) {
          // If vote time has already passed but proposal hasn't ended, vote now
          if (currentTimeMs < proposalEndTimeMs) {
            logger.info(`  Vote time already passed, voting immediately for agent ${agent.name}`);
            await castVote(proposal, agent.address, agent.privateKey, defaultVote);
          } else {
            logger.info(`  Proposal has already ended, skipping for agent ${agent.name}`);
          }
        } else {
          // Schedule the vote in the database for the future
          const scheduledTime = new Date(voteTimeMs);
          const delayMinutes = Math.round((voteTimeMs - currentTimeMs) / (60 * 1000));
          
          logger.info(`  Scheduling vote in ${delayMinutes} minutes for agent ${agent.name}`);
          await scheduleVoteInDb(proposal, agent, defaultVote, scheduledTime);
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
      
      await castVote(proposal, agent.address, agent.privateKey, vote.defaultVote);
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
  agentPrivateKey: string,
  defaultVote: number
): Promise<void> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(agentPrivateKey, provider);
    const contract = new ethers.Contract(DELEGATE_CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    
    logger.info(`Casting vote for proposal: ${proposal.title} (${proposal.id}) with agent ${agentAddress}`);
    
    // Get the chain ID from the provider
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    // Parameters for castSpaceVoteFor
    const voter = agentAddress; // The voter's address 
    const targetChainId = chainId; // Current chain ID
    const space = proposal.space.id; // The space ID (e.g., "uniswap.eth")
    const proposalId = BigInt(proposal.id); // The proposal ID
    const vote = defaultVote.toString(); // The vote choice as a string
    const module = MODULE_ADDRESS; // Delegate module address
    const voteProof = "0x"; // Empty bytes for now as placeholder for vote proof
    
    // Submit the vote via the DeleGate contract
    const tx = await contract.castSpaceVoteFor(
      voter,
      targetChainId,
      space,
      proposalId,
      vote,
      module,
      voteProof
    );
    
    logger.info(`Vote transaction submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    logger.info(`Vote transaction confirmed in block ${receipt.blockNumber}: ${tx.hash}`);
  } catch (error) {
    logger.error(`Vote failed for proposal ${proposal.id}: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}