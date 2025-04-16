import { ethers } from 'ethers';
import { SnapshotProposal } from './types';
import { RPC_URL, VOTE_HOURS_BEFORE_END, DELEGATE_CONTRACT_ADDRESS } from './config';
import { getAgentsForSpace } from './db/service';
import logger from './logger';

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
          // Schedule the vote for the future
          const delayMs = voteTimeMs - currentTimeMs;
          const delayMinutes = Math.round(delayMs / (60 * 1000));
          
          logger.info(`  Scheduling vote in ${delayMinutes} minutes for agent ${agent.name}`);
          
          scheduleVoteForProposal(proposal, agent.address, agent.privateKey, defaultVote, delayMs);
        }
      }
    } catch (error) {
      logger.error(`Failed to process proposal ${proposal.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Schedules a vote for a proposal at a specific time
 */
export function scheduleVoteForProposal(
  proposal: SnapshotProposal,
  agentAddress: string,
  agentPrivateKey: string,
  defaultVote: number,
  delayMs: number
): void {
  const voteTimer = setTimeout(async () => {
    try {
      logger.info(`Executing scheduled vote for proposal: ${proposal.title} (${proposal.id}) for agent ${agentAddress}`);
      await castVote(proposal, agentAddress, agentPrivateKey, defaultVote);
    } catch (error) {
      logger.error(`Failed to execute scheduled vote: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, delayMs);
  
  // Prevent the timer from keeping the process alive if it's the only thing left
  voteTimer.unref();
  
  logger.info(`Vote scheduled for ${proposal.title}, will execute at ${new Date(Date.now() + delayMs).toISOString()}`);
}

/**
 * Casts a vote on a proposal using the DeleGate contract
 */
async function castVote(
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