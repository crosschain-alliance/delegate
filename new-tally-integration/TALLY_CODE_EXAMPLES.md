# Tally Integration - Code Examples

This document provides concrete code examples for implementing Tally support alongside Snapshot.

---

## 1. Constants & Configuration

### File: `Davos-UI/src/lib/constants.ts`

**Add these constants**:

```typescript
// Tally API Configuration
export const TALLY_API_URL = 'https://api.tally.xyz/query';
export const TALLY_API_KEY = import.meta.env.VITE_TALLY_API_KEY || '';

// Tally Governor Addresses (examples)
export const TALLY_GOVERNORS = {
  UNISWAP: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  ARBITRUM: '0x789e6a0a87b60c76d1e6b0b1761f960d7d7aad89',
  // Add more as needed
} as const;

// Extend daoConfig with Tally DAOs
export const daoConfig: Record<string, DaoConfigItem> = {
  // ... existing Snapshot DAOs ...
  
  // Tally DAOs
  uniswap_governor: {
    name: 'Uniswap Governor',
    logo: uniswapLogo,
    source: 'tally',
    identifier: TALLY_GOVERNORS.UNISWAP,
    tokenAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    chainId: CHAIN_IDS.ETHEREUM,
    totalMembers: 360515,
    proposals: 150,
    votes: 12.5,
  },
  arbitrum_governor: {
    name: 'Arbitrum Governor',
    logo: arbitrumLogo,
    source: 'tally',
    identifier: TALLY_GOVERNORS.ARBITRUM,
    tokenAddress: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    chainId: CHAIN_IDS.ARBITRUM,
    totalMembers: 1428677,
    proposals: 200,
    votes: 8.3,
  },
};
```

---

## 2. Tally Utilities

### File: `Davos-UI/src/lib/tally-utils.ts` (NEW)

```typescript
import { TALLY_API_URL, TALLY_API_KEY } from './constants';

/**
 * Tally GraphQL Queries
 */

export const TALLY_GOVERNOR_QUERY = `
  query Governor($input: GovernorInput!) {
    governor(input: $input) {
      id
      name
      description
      token {
        name
        symbol
        decimals
        totalSupply
      }
      votingDelay
      votingPeriod
      proposalThreshold
      quorumNumerator
      timelockDelay
      proposalsCount
      delegatesCount
    }
  }
`;

export const TALLY_PROPOSALS_QUERY = `
  query Proposals($input: ProposalsInput!) {
    proposals(input: $input) {
      nodes {
        ... on Proposal {
          id
          metadata {
            title
            description
            snapshotURL
            discourseURL
          }
          block {
            timestamp
          }
          state
          startBlock
          endBlock
          proposer {
            address
          }
          votes {
            weight
            support
          }
          voteStats {
            forVotes
            againstVotes
            abstainVotes
          }
        }
      }
      pageInfo {
        firstCursor
        lastCursor
        count
      }
    }
  }
`;

export const TALLY_DELEGATION_QUERY = `
  query Delegation($input: DelegationInput!) {
    delegation(input: $input) {
      delegator {
        address
      }
      delegatee {
        address
      }
      votes
      block {
        timestamp
      }
    }
  }
`;

export const TALLY_ACCOUNT_QUERY = `
  query Account($input: AccountInput!) {
    account(input: $input) {
      address
      votes {
        nodes {
          proposal {
            id
            title
          }
          support
          weight
          reason
        }
      }
      delegations {
        nodes {
          delegatee {
            address
          }
          votes
        }
      }
    }
  }
`;

/**
 * Base Tally GraphQL fetch function
 */
export async function fetchTallyGraphQL(
  query: string,
  variables: Record<string, any> = {}
) {
  if (!TALLY_API_KEY) {
    throw new Error('Tally API key not configured');
  }

  try {
    const response = await fetch(TALLY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': TALLY_API_KEY,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(
        `GraphQL error: ${data.errors.map((e: any) => e.message).join(', ')}`
      );
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching Tally GraphQL data:', error);
    throw error;
  }
}

/**
 * Fetch Governor (DAO) information
 */
export async function fetchTallyGovernor(governorId: string) {
  const result = await fetchTallyGraphQL(TALLY_GOVERNOR_QUERY, {
    input: {
      governorId,
    },
  });

  return result.governor;
}

/**
 * Fetch proposals for a Governor
 */
export async function fetchTallyProposals(
  governorId: string,
  limit: number = 100,
  afterCursor?: string
) {
  const pageInput: any = { limit };
  if (afterCursor) {
    pageInput.afterCursor = afterCursor;
  }

  const result = await fetchTallyGraphQL(TALLY_PROPOSALS_QUERY, {
    input: {
      filters: {
        governorId,
      },
      page: pageInput,
      sort: {
        sortBy: 'id',
        isDescending: true,
      },
    },
  });

  return result.proposals;
}

/**
 * Fetch all proposals with pagination
 */
export async function fetchAllTallyProposals(
  governorId: string,
  limit: number = 2000
) {
  const allProposals: any[] = [];
  let cursor: string | undefined;
  let totalFetched = 0;

  while (totalFetched < limit) {
    const result = await fetchTallyProposals(
      governorId,
      Math.min(100, limit - totalFetched),
      cursor
    );

    if (!result.nodes || result.nodes.length === 0) {
      break;
    }

    allProposals.push(...result.nodes);
    totalFetched += result.nodes.length;

    const pageInfo = result.pageInfo;
    if (!pageInfo.lastCursor || result.nodes.length < 100) {
      break;
    }

    cursor = pageInfo.lastCursor;
  }

  return { proposals: allProposals };
}

/**
 * Fetch delegation information
 */
export async function fetchTallyDelegation(
  delegator: string,
  governorId: string
) {
  const result = await fetchTallyGraphQL(TALLY_DELEGATION_QUERY, {
    input: {
      delegator,
      governorId,
    },
  });

  return result.delegation;
}

/**
 * Fetch account information (votes and delegations)
 */
export async function fetchTallyAccount(
  address: string,
  governorId: string
) {
  const result = await fetchTallyGraphQL(TALLY_ACCOUNT_QUERY, {
    input: {
      address,
      governorId,
    },
  });

  return result.account;
}
```

---

## 3. Data Normalizer

### File: `Davos-UI/src/lib/data-normalizer.ts` (NEW)

```typescript
/**
 * Unified data format for proposals from different sources
 */
export interface NormalizedProposal {
  id: string;
  title: string;
  description: string;
  state: 'pending' | 'active' | 'closed' | 'canceled' | 'defeated' | 'succeeded';
  startTime: number; // Unix timestamp in seconds
  endTime: number; // Unix timestamp in seconds
  choices: string[];
  scores: number[];
  totalVotes: number;
  author: string;
  source: 'snapshot' | 'tally';
  sourceData: any; // Original data from source
}

/**
 * Normalize Snapshot proposal to unified format
 */
export function normalizeSnapshotProposal(proposal: any): NormalizedProposal {
  return {
    id: proposal.id,
    title: proposal.title,
    description: proposal.body,
    state: normalizeSnapshotState(proposal.state),
    startTime: proposal.start,
    endTime: proposal.end,
    choices: proposal.choices || [],
    scores: proposal.scores || [],
    totalVotes: proposal.scores_total || 0,
    author: proposal.author,
    source: 'snapshot',
    sourceData: proposal,
  };
}

/**
 * Normalize Tally proposal to unified format
 */
export function normalizeTallyProposal(proposal: any): NormalizedProposal {
  // Parse ISO timestamp to Unix timestamp
  const startTime = proposal.block?.timestamp
    ? new Date(proposal.block.timestamp).getTime() / 1000
    : 0;

  // Calculate end time based on voting period (estimate)
  const endTime = startTime + 50400; // ~7 days in seconds (typical Governor voting period)

  // Map Tally support values to choice labels
  const choices = ['Against', 'For', 'Abstain'];

  // Calculate scores from vote stats
  const voteStats = proposal.voteStats || {};
  const scores = [
    parseInt(voteStats.againstVotes || '0'),
    parseInt(voteStats.forVotes || '0'),
    parseInt(voteStats.abstainVotes || '0'),
  ];

  const totalVotes = scores.reduce((sum, score) => sum + score, 0);

  return {
    id: proposal.id,
    title: proposal.metadata?.title || 'Untitled',
    description: proposal.metadata?.description || '',
    state: normalizeTallyState(proposal.state),
    startTime,
    endTime,
    choices,
    scores,
    totalVotes,
    author: proposal.proposer?.address || 'Unknown',
    source: 'tally',
    sourceData: proposal,
  };
}

/**
 * Normalize Snapshot proposal state to unified format
 */
function normalizeSnapshotState(
  state: string
): NormalizedProposal['state'] {
  switch (state?.toLowerCase()) {
    case 'pending':
      return 'pending';
    case 'active':
      return 'active';
    case 'closed':
      return 'closed';
    default:
      return 'closed';
  }
}

/**
 * Normalize Tally proposal state to unified format
 */
function normalizeTallyState(
  state: string
): NormalizedProposal['state'] {
  switch (state?.toUpperCase()) {
    case 'PENDING':
      return 'pending';
    case 'ACTIVE':
      return 'active';
    case 'CANCELED':
      return 'canceled';
    case 'DEFEATED':
      return 'defeated';
    case 'SUCCEEDED':
      return 'succeeded';
    case 'QUEUED':
      return 'active'; // Treat as active for UI purposes
    case 'EXPIRED':
      return 'closed';
    case 'EXECUTED':
      return 'closed';
    default:
      return 'closed';
  }
}

/**
 * Normalize DAO info from different sources
 */
export interface NormalizedDAO {
  id: string;
  name: string;
  description: string;
  members: number;
  proposalsCount: number;
  votesCount: number;
  source: 'snapshot' | 'tally';
  sourceData: any;
}

export function normalizeSnapshotDAO(space: any): NormalizedDAO {
  return {
    id: space.id,
    name: space.name,
    description: space.about || '',
    members: space.members || 0,
    proposalsCount: space.proposalsCount || 0,
    votesCount: space.votesCount || 0,
    source: 'snapshot',
    sourceData: space,
  };
}

export function normalizeTallyDAO(governor: any): NormalizedDAO {
  return {
    id: governor.id,
    name: governor.name,
    description: governor.description || '',
    members: governor.delegatesCount || 0,
    proposalsCount: governor.proposalsCount || 0,
    votesCount: 0, // Not directly available in Tally
    source: 'tally',
    sourceData: governor,
  };
}
```

---

## 4. Enhanced DAO Utilities

### File: `Davos-UI/src/lib/dao-utils.ts` (MODIFIED)

**Add these functions**:

```typescript
import { fetchTallyGovernor, fetchAllTallyProposals } from './tally-utils';
import { normalizeTallyDAO, normalizeTallyProposal } from './data-normalizer';

/**
 * Enhanced fetchDaoInfo with source routing
 */
export async function fetchDaoInfo(
  source: string = 'snapshot',
  identifier: string = 'aave.eth'
): Promise<any> {
  if (source === 'snapshot') {
    return fetchSnapshotDaoInfo(identifier);
  } else if (source === 'tally') {
    return fetchTallyDaoInfo(identifier);
  }
  throw new Error(`Unknown source: ${source}`);
}

/**
 * Fetch Tally DAO info
 */
async function fetchTallyDaoInfo(governorId: string): Promise<any> {
  try {
    const governor = await fetchTallyGovernor(governorId);
    return normalizeTallyDAO(governor);
  } catch (error) {
    console.error('Error fetching Tally DAO info:', error);
    throw error;
  }
}

/**
 * Enhanced fetchProposals with source routing
 */
export async function fetchProposals(
  source: string,
  identifier: string,
  limit: number = 300
): Promise<any> {
  if (source === 'snapshot') {
    return fetchSnapshotProposals(identifier, limit);
  } else if (source === 'tally') {
    return fetchTallyProposalsData(identifier, limit);
  }
  throw new Error(`Unknown source: ${source}`);
}

/**
 * Fetch Tally proposals
 */
async function fetchTallyProposalsData(
  governorId: string,
  limit: number = 300
): Promise<any> {
  try {
    const result = await fetchAllTallyProposals(governorId, limit);
    const normalizedProposals = result.proposals.map(normalizeTallyProposal);
    return { proposals: normalizedProposals };
  } catch (error) {
    console.error('Error fetching Tally proposals:', error);
    throw error;
  }
}

/**
 * React Query hook for Tally DAO info
 */
export function useTallyDaoInfo(
  governorId: string,
  options = {}
) {
  return useQuery({
    queryKey: ['tallyDaoInfo', governorId],
    queryFn: () => fetchTallyDaoInfo(governorId),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * React Query hook for Tally proposals
 */
export function useTallyProposals(
  governorId: string,
  limit: number = 300,
  options = {}
) {
  return useQuery({
    queryKey: ['tallyProposals', governorId, limit],
    queryFn: () => fetchTallyProposalsData(governorId, limit),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  });
}
```

---

## 5. Enhanced Delegation Utilities

### File: `Davos-UI/src/lib/utils.ts` (MODIFIED)

**Add these functions**:

```typescript
import { readContract } from '@wagmi/core';

// Tally Governor ABI (simplified)
const TALLY_GOVERNOR_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'delegates',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'delegatee', type: 'address' }],
    name: 'delegate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * Get Tally delegation status
 */
export async function getTallyDelegation(
  user: `0x${string}`,
  governorAddress: `0x${string}`
): Promise<{ exists: boolean; target: `0x${string}` | null }> {
  try {
    const delegatee = (await readContract(config, {
      address: governorAddress,
      abi: TALLY_GOVERNOR_ABI,
      functionName: 'delegates',
      args: [user],
    })) as `0x${string}`;

    const exists = delegatee.toLowerCase() !== ZERO_ADDRESS;
    return { exists, target: exists ? delegatee : null };
  } catch (error) {
    console.error('Error fetching Tally delegation:', error);
    throw error;
  }
}

/**
 * Enhanced getDelegationStatus with source routing
 */
export async function getDelegationStatus(
  user: `0x${string}`,
  source: string,
  identifier: string
): Promise<{ exists: boolean; target: `0x${string}` | null }> {
  if (source === 'snapshot') {
    return getSnapshotDelegation(user, identifier);
  } else if (source === 'tally') {
    return getTallyDelegation(user, identifier as `0x${string}`);
  }
  throw new Error(`Unknown source: ${source}`);
}

/**
 * Delegate on Tally
 */
export async function delegateTallyOnChain(
  client: PublicClient,
  governorAddress: `0x${string}`,
  delegator: `0x${string}`,
  delegatee: `0x${string}`,
  writeContractAsync: any
) {
  const { gas, maxFeePerGas, maxPriorityFeePerGas } =
    await calculateGasFees(client, {
      account: delegator,
      address: governorAddress,
      abi: TALLY_GOVERNOR_ABI,
      functionName: 'delegate',
      args: [delegatee],
    });

  return writeContractAsync({
    address: governorAddress,
    abi: TALLY_GOVERNOR_ABI,
    functionName: 'delegate',
    args: [delegatee],
    gas: (gas * 150n) / 100n,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });
}

/**
 * Enhanced delegateOnChain with source routing
 */
export async function delegateOnChain(
  client: PublicClient,
  source: string,
  identifier: string,
  delegator: `0x${string}`,
  delegatee: `0x${string}`,
  writeContractAsync: any
) {
  if (source === 'snapshot') {
    return delegateSnapshotOnChain(
      client,
      identifier,
      delegator,
      delegatee,
      writeContractAsync
    );
  } else if (source === 'tally') {
    return delegateTallyOnChain(
      client,
      identifier as `0x${string}`,
      delegator,
      delegatee,
      writeContractAsync
    );
  }
  throw new Error(`Unknown source: ${source}`);
}
```

---

## 6. Vote Executor

### File: `davos-mvp/voter/src/tally_executor.ts` (NEW)

```typescript
import { ethers } from 'ethers';
import { KEYRING_GATEWAY_CONTRACT_ADDRESS, RPC_URL } from './config';
import { publicClient } from './lib/utils';
import logger from './logger';
import KeyringGatewayABI from './artifacts/KeyringGateway.json';
import { getAgentByKmsAddress } from './db/service';
import { Address } from 'viem';

// Governor contract ABI (simplified)
const GOVERNOR_ABI = [
  'function castVote(uint256 proposalId, uint8 support) external returns (uint96)',
  'function castVoteBySig(uint256 proposalId, uint8 support, uint8 v, bytes32 r, bytes32 s) external returns (uint96)',
];

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

/**
 * Submit a vote on a Tally Governor
 * support: 0 = Against, 1 = For, 2 = Abstain
 */
export const tallyVote = async (signer: Address, tallyVote: any) => {
  try {
    const agent = await getAgentByKmsAddress(signer);

    if (!agent) {
      logger.error(`Agent not found for signer: ${signer}`);
      return;
    }

    const wallet = new ethers.Wallet(agent.privateKey, provider);

    logger.info(`Submitting Tally vote from: ${wallet.address}`);
    logger.info(`Governor: ${tallyVote.governorAddress}`);
    logger.info(`Proposal ID: ${tallyVote.proposalId}`);
    logger.info(`Support: ${tallyVote.support}`);

    const governorContract = new ethers.Contract(
      tallyVote.governorAddress,
      GOVERNOR_ABI,
      wallet
    );

    // Cast vote on-chain
    const tx = await governorContract.castVote(
      tallyVote.proposalId,
      tallyVote.support
    );

    logger.info(`Tally vote transaction submitted: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();

    logger.info(`Tally vote confirmed in block: ${receipt.blockNumber}`);
    logger.info(`Transaction receipt: ${JSON.stringify(receipt, null, 2)}`);

    return receipt;
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error voting on Tally: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
    } else {
      logger.error(`Error voting on Tally: ${JSON.stringify(error, null, 2)}`);
    }
    throw error;
  }
};

let eventWatcher: any = null;

/**
 * Watch for Tally vote events from the Keyring Gateway contract
 */
export async function watchTallyEvents(): Promise<void> {
  logger.info(
    `Starting Tally event watcher on ${RPC_URL}\nGateway address: ${KEYRING_GATEWAY_CONTRACT_ADDRESS}`
  );

  try {
    eventWatcher = publicClient.watchContractEvent({
      address: KEYRING_GATEWAY_CONTRACT_ADDRESS,
      abi: KeyringGatewayABI.abi,
      eventName: 'tallySignVote', // Assuming similar event name
      onLogs: (logs) => {
        logs.forEach((log) => {
          try {
            const { args } = log as any;
            logger.info(`Received Tally vote event:`, args);

            if (args) {
              logger.info(`Sender: ${args.sender}`);
              tallyVote(args.sender, args.vote);
            }
          } catch (error) {
            logger.error(
              `Error handling Tally vote event: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        });
      },
    });

    logger.info('Tally event watcher started successfully');
    return Promise.resolve();
  } catch (error) {
    logger.error(
      `Failed to start Tally event watcher: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}

/**
 * Stop watching for Tally events
 */
export function stopTallyEventWatcher(): void {
  if (eventWatcher) {
    eventWatcher();
    eventWatcher = null;
    logger.info('Tally event watcher stopped');
  }
}
```

---

## 7. Enhanced Fetcher

### File: `davos-mvp/voter/src/fetcher.ts` (MODIFIED)

**Add these functions**:

```typescript
import { fetchAllTallyProposals } from '../lib/tally-utils';

export interface TallyProposal {
  id: string;
  title: string;
  description: string;
  state: string;
  startBlock: number;
  endBlock: number;
  proposer: string;
}

/**
 * Fetch active Tally proposals
 */
export async function fetchTallyProposals(
  governorId: string
): Promise<TallyProposal[]> {
  try {
    logger.info(`Fetching Tally proposals for Governor: ${governorId}`);

    const result = await fetchAllTallyProposals(governorId, 100);
    const proposals = result.proposals || [];

    logger.info(`Fetched ${proposals.length} Tally proposals`);

    return proposals.map((p: any) => ({
      id: p.id,
      title: p.metadata?.title || 'Untitled',
      description: p.metadata?.description || '',
      state: p.state,
      startBlock: p.startBlock,
      endBlock: p.endBlock,
      proposer: p.proposer?.address || 'Unknown',
    }));
  } catch (error) {
    logger.error(
      `Error fetching Tally proposals: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return [];
  }
}

/**
 * Enhanced fetchProposals with source routing
 */
export async function fetchProposals(
  source: string,
  identifier: string
): Promise<SnapshotProposal[] | TallyProposal[]> {
  if (source === 'snapshot') {
    return fetchSnapshotProposals(identifier);
  } else if (source === 'tally') {
    return fetchTallyProposals(identifier);
  }
  throw new Error(`Unknown source: ${source}`);
}
```

---

## 8. API Endpoint Example

### File: `davos-mvp/voter/src/api/server.ts` (MODIFIED)

**Add this endpoint**:

```typescript
/**
 * POST /api/vote - Submit a vote (Snapshot or Tally)
 */
app.post('/api/vote', async (req, res) => {
  try {
    const {
      source = 'snapshot',
      kmsAdapterAddress,
      space,
      proposal,
      governorAddress,
      proposalId,
      support,
      type = 'single-choice',
      choice,
    } = req.body;

    if (!kmsAdapterAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: kmsAdapterAddress',
      });
    }

    if (source === 'snapshot') {
      if (!space || !proposal || choice === undefined) {
        return res.status(400).json({
          success: false,
          error:
            'Missing required parameters for Snapshot. Required: space, proposal, choice',
        });
      }

      const { snapshotVote } = await import('../snapshot_executor');
      const voteData = { space, proposal, type, choice };

      logger.info(
        `Manually triggering Snapshot vote: ${JSON.stringify(voteData)}`
      );
      await snapshotVote(kmsAdapterAddress as Address, voteData);

      return res.status(200).json({
        success: true,
        message: 'Snapshot vote submission initiated',
        vote: voteData,
      });
    } else if (source === 'tally') {
      if (!governorAddress || !proposalId || support === undefined) {
        return res.status(400).json({
          success: false,
          error:
            'Missing required parameters for Tally. Required: governorAddress, proposalId, support',
        });
      }

      const { tallyVote } = await import('../tally_executor');
      const voteData = { governorAddress, proposalId, support };

      logger.info(
        `Manually triggering Tally vote: ${JSON.stringify(voteData)}`
      );
      await tallyVote(kmsAdapterAddress as Address, voteData);

      return res.status(200).json({
        success: true,
        message: 'Tally vote submission initiated',
        vote: voteData,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: `Unknown source: ${source}. Must be 'snapshot' or 'tally'`,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to submit vote: ${errorMessage}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit vote',
      message: errorMessage,
    });
  }
});
```

---

## 9. React Hook Example

### File: `Davos-UI/src/hooks/use-dao.ts` (MODIFIED)

**Add this hook**:

```typescript
/**
 * Enhanced hook for fetching DAO info with source routing
 */
export function useDaoInfo(
  source: string = 'snapshot',
  identifier: string = 'aave.eth',
  options = {}
) {
  return useQuery({
    queryKey: ['daoInfo', source, identifier],
    queryFn: () => fetchDaoInfo(source, identifier),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Enhanced hook for fetching proposals with source routing
 */
export function useProposals(
  source: string,
  identifier: string,
  limit: number = 300,
  options = {}
) {
  return useQuery({
    queryKey: ['proposals', source, identifier, limit],
    queryFn: () => fetchProposals(source, identifier, limit),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Hook for fetching multiple DAOs with source support
 */
export function useMultipleDaos(
  daos: Array<{ source?: string; identifier: string }>,
  options = {}
) {
  return useQueries({
    queries: daos.map((dao) => ({
      queryKey: ['daoInfo', dao.source || 'snapshot', dao.identifier],
      queryFn: () =>
        fetchDaoInfo(dao.source || 'snapshot', dao.identifier),
      staleTime: STALE_TIME,
      gcTime: GC_TIME,
      ...options,
    })),
  });
}
```

---

## 10. Error Handling Example

### File: `Davos-UI/src/lib/error-handler.ts` (NEW)

```typescript
/**
 * Handle API errors from different sources
 */
export function handleDaoError(
  error: any,
  source: string,
  context: string
): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (source === 'snapshot') {
      if (message.includes('not found')) {
        return `Snapshot space not found. Please check the identifier.`;
      }
      if (message.includes('rate limit')) {
        return `Snapshot API rate limit exceeded. Please try again later.`;
      }
    } else if (source === 'tally') {
      if (message.includes('not found')) {
        return `Tally Governor not found. Please check the address.`;
      }
      if (message.includes('api key')) {
        return `Tally API key not configured. Please contact support.`;
      }
      if (message.includes('rate limit')) {
        return `Tally API rate limit exceeded. Please try again later.`;
      }
    }

    return `Error ${context}: ${error.message}`;
  }

  return `Unknown error occurred while ${context}`;
}

/**
 * Handle vote submission errors
 */
export function handleVoteError(
  error: any,
  source: string
): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (source === 'snapshot') {
      if (message.includes('insufficient voting power')) {
        return `You don't have enough voting power to vote on this proposal.`;
      }
      if (message.includes('proposal not found')) {
        return `Proposal not found. It may have ended or been canceled.`;
      }
    } else if (source === 'tally') {
      if (message.includes('insufficient voting power')) {
        return `You don't have enough voting power to vote on this proposal.`;
      }
      if (message.includes('voting is closed')) {
        return `Voting period has ended for this proposal.`;
      }
      if (message.includes('out of gas')) {
        return `Transaction ran out of gas. Please try again with higher gas limit.`;
      }
    }

    return `Vote submission failed: ${error.message}`;
  }

  return `Vote submission failed. Please try again.`;
}
```

---

## Summary

These code examples provide:

1. **Constants & Configuration** - Add Tally API and DAO configuration
2. **Tally Utilities** - GraphQL queries and fetch functions
3. **Data Normalizer** - Unified data format for both sources
4. **Enhanced DAO Utilities** - Source routing for DAO info and proposals
5. **Enhanced Delegation** - Source routing for delegation functions
6. **Vote Executor** - Tally vote submission
7. **Enhanced Fetcher** - Source routing for proposal fetching
8. **API Endpoints** - Multi-source vote submission
9. **React Hooks** - Enhanced hooks with source support
10. **Error Handling** - Source-specific error messages
