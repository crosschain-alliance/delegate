import { Address } from 'viem';
import { snapshotVote } from './snapshot_executor';
import { tallyVote } from './tally_executor';
import { VoteParams, TallyVoteParams } from './types';
import logger from './logger';

/**
 * Unified vote submission that routes to the appropriate voting system
 * based on the vote source (snapshot or tally)
 * 
 * @param signer The wallet address of the voter
 * @param vote Vote parameters - can be either VoteParams (Snapshot) or TallyVoteParams (Tally)
 * @param source The voting system to use: 'snapshot' or 'tally'
 */
export async function submitVote(
  signer: Address,
  vote: VoteParams | TallyVoteParams,
  source: 'snapshot' | 'tally'
): Promise<any> {
  try {
    logger.info(`Submitting vote via ${source} from ${signer}`);
    logger.info(`Vote data: ${JSON.stringify(vote, null, 2)}`);

    if (source === 'snapshot') {
      const snapshotVoteParams = vote as VoteParams;
      return await snapshotVote(signer, snapshotVoteParams);
    } else if (source === 'tally') {
      const tallyVoteParams = vote as TallyVoteParams;
      return await tallyVote(signer, tallyVoteParams);
    } else {
      throw new Error(`Unknown vote source: ${source}`);
    }
  } catch (error) {
    logger.error(`Failed to submit vote via ${source}: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Determine the vote source from proposal data
 * 
 * @param proposal The proposal data (could be SnapshotProposal or TallyProposal)
 * @returns The source type: 'snapshot' or 'tally'
 */
export function getVoteSource(proposal: any): 'snapshot' | 'tally' {
  // Check if it has Tally-specific fields
  if ('governorAddress' in proposal && 'proposalId' in proposal && 'state' in proposal) {
    return 'tally';
  }
  
  // Check if it has Snapshot-specific fields
  if ('space' in proposal && 'choices' in proposal && 'snapshot' in proposal) {
    return 'snapshot';
  }

  // Default to snapshot for backward compatibility
  logger.warn('Could not determine vote source from proposal data, defaulting to snapshot');
  return 'snapshot';
}

/**
 * Convert between vote formats if needed
 * 
 * @param vote The vote parameters
 * @param targetSource The target source format
 * @returns The vote parameters in the target format
 */
export function convertVoteFormat(
  vote: VoteParams | TallyVoteParams,
  targetSource: 'snapshot' | 'tally'
): VoteParams | TallyVoteParams {
  // Note: Conversion between formats is complex and loses information
  // This function primarily validates compatibility
  
  if (targetSource === 'snapshot' && 'support' in vote) {
    // Converting from Tally to Snapshot format
    logger.warn('Converting vote from Tally to Snapshot format - some data may be lost');
    const tallyVote = vote as TallyVoteParams;
    // Map Tally support values to Snapshot choice (assuming 3-option vote)
    const choiceMap = {
      0: 1, // Against
      1: 2, // For
      2: 3, // Abstain
    };
    return {
      space: '', // Not available in conversion
      proposal: tallyVote.proposalId,
      type: 'single-choice',
      choice: choiceMap[tallyVote.support as keyof typeof choiceMap],
    } as VoteParams;
  }

  if (targetSource === 'tally' && 'choice' in vote) {
    // Converting from Snapshot to Tally format
    logger.warn('Converting vote from Snapshot to Tally format - some data may be lost');
    const snapshotVote = vote as VoteParams;
    // Map Snapshot choice to Tally support value (assuming 3-option vote)
    const supportMap = {
      1: 0, // Against
      2: 1, // For
      3: 2, // Abstain
    };
    return {
      governorAddress: '', // Not available in conversion
      proposalId: snapshotVote.proposal,
      support: supportMap[snapshotVote.choice as keyof typeof supportMap] as 0 | 1 | 2,
    } as TallyVoteParams;
  }

  // No conversion needed
  return vote;
}
