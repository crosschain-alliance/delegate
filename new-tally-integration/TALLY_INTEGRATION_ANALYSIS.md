# Tally Integration Analysis - Davos Platform

## Executive Summary

This document provides a comprehensive analysis of integrating Tally alongside Snapshot in the Davos platform. It covers the current Snapshot implementation, Tally's equivalent APIs and data models, integration points, and architectural considerations.

---

## Part 1: Current Snapshot Implementation

### 1.1 Snapshot API Calls Overview

The current codebase makes the following types of Snapshot calls:

#### **A. GraphQL API Calls** (Primary)
- **Endpoint**: `https://hub.snapshot.org/graphql`
- **Method**: POST with GraphQL queries
- **Authentication**: None required (public API)

#### **B. Key GraphQL Queries**

1. **Space Query** - Fetch DAO metadata
   ```graphql
   query Space($id: String!) {
     space(id: $id) {
       id
       name
       about
       network
       symbol
       members
       admins
       strategies { name }
       proposalsCount
       votesCount
       followersCount
     }
   }
   ```
   - **Used in**: `fetchGraphQL()` in `snapshot-utils.ts`
   - **Purpose**: Get DAO information and statistics

2. **Proposals Query** - Fetch proposals for a space
   ```graphql
   query Proposals($space: String!, $limit: Int) {
     proposals(
       first: $limit,
       skip: 0,
       where: { space: $space, flagged: false },
       orderBy: "created",
       orderDirection: desc
     ) {
       id, title, body, choices, start, end, snapshot, state, author, scores, scores_total, votes
     }
   }
   ```
   - **Used in**: `fetchAllProposals()` in `snapshot-utils.ts`
   - **Purpose**: Get active/historical proposals with voting data

#### **C. Contract Calls** (On-chain)
- **Contract**: Snapshot Delegation Registry
- **Address**: `0x469788fE6E9E9681C6ebF3bF78e7Fd26Fc015446`
- **Functions**:
  - `delegation(delegator, spaceId)` - Check delegation status
  - `setDelegate(spaceId, delegatee)` - Set delegation

#### **D. Voting Execution**
- **Library**: `@snapshot-labs/snapshot.js`
- **Method**: `client.vote()` - Submit votes via EIP-712 signatures
- **Used in**: `snapshot_executor.ts` (backend voter service)

#### **E. External Links**
- **UI Navigation**: Links to `https://snapshot.org/#/{dao.identifier}`

### 1.2 Data Flow Architecture

```
Frontend (Davos-UI)
├── snapshot-utils.ts (GraphQL queries)
├── dao-utils.ts (DAO info fetching)
├── use-dao.ts (React hooks)
└── utils.ts (delegation verification)
    ↓
Snapshot GraphQL API (https://hub.snapshot.org/graphql)
    ↓
Backend (davos-mvp)
├── proposal-api/proposal_analyzer.py (proposal analysis)
├── voter/snapshot_executor.ts (vote submission)
└── voter/fetcher.ts (proposal fetching)
    ↓
Snapshot Delegation Registry (on-chain contract)
```

### 1.3 Current Configuration

**Frontend Constants** (`Davos-UI/src/lib/constants.ts`):
```typescript
export const SNAPSHOT_API_URL = 'https://hub.snapshot.org/graphql';
export const SNAPSHOT_DELEGATION_REGISTRY = '0x469788fE6E9E9681C6ebF3bF78e7Fd26Fc015446';
export const DAVOS_API_ENDPOINT = 'http://127.0.0.1:5001'; // or ngrok URL
```

**DAO Configuration**:
```typescript
export const daoConfig = {
  aave: { source: 'snapshot', identifier: 'aavedao.eth', ... },
  arbitrum: { source: 'snapshot', identifier: 'arbitrumfoundation.eth', ... },
  // ... more DAOs
}
```

---

## Part 2: Tally API & Data Model

### 2.1 Tally GraphQL API

**Endpoint**: `https://api.tally.xyz/query`

**Authentication**: 
- Requires API Key in headers: `{ "Api-Key": "your-api-key" }`
- Current key in codebase: `dcd8a84a103c7d3a55047b78206c03a14c8344087a0a5656d116124300a4c78c`

### 2.2 Key Tally Concepts

| Concept | Snapshot | Tally | Notes |
|---------|----------|-------|-------|
| **DAO Identifier** | Space ID (e.g., `aave.eth`) | Governor ID (contract address) | Tally uses on-chain Governor contracts |
| **Voting System** | Off-chain voting | On-chain Governor contracts | Tally is built on OpenZeppelin Governor |
| **Delegation** | Snapshot Delegation Registry | Governor contract delegation | Native to Governor contract |
| **Voting Power** | Strategies (ERC20, etc.) | Token balance at block height | Simpler, more standardized |
| **Proposal State** | `active`, `closed`, `pending` | `Pending`, `Active`, `Canceled`, `Defeated`, `Succeeded`, `Queued`, `Expired`, `Executed` | More granular states |

### 2.3 Tally GraphQL Queries

#### **A. Proposals Query** (Primary)
```graphql
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
      }
    }
    pageInfo {
      firstCursor
      lastCursor
      count
    }
  }
}
```

**Input Structure**:
```typescript
{
  filters: {
    governorId: "0x...", // Governor contract address
    state: "Active" // Optional: filter by state
  },
  page: {
    limit: 100,
    afterCursor: "cursor-string" // For pagination
  },
  sort: {
    sortBy: "id",
    isDescending: true
  }
}
```

#### **B. Governor Query** (DAO Metadata)
```graphql
query Governor($input: GovernorInput!) {
  governor(input: $input) {
    id
    name
    description
    token {
      name
      symbol
      decimals
    }
    votingDelay
    votingPeriod
    proposalThreshold
    quorumNumerator
    timelockDelay
  }
}
```

#### **C. Delegation Query**
```graphql
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
```

#### **D. Account/Voter Query**
```graphql
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
```

### 2.4 Tally Data Response Structure

**Proposal Response Example**:
```json
{
  "data": {
    "proposals": {
      "nodes": [
        {
          "id": "0x...",
          "metadata": {
            "title": "Proposal Title",
            "description": "Proposal description...",
            "snapshotURL": "https://snapshot.org/#/...",
            "discourseURL": "https://forum.example.com/t/..."
          },
          "block": {
            "timestamp": "2023-06-06T15:56:32Z"
          },
          "state": "Active",
          "startBlock": 17500000,
          "endBlock": 17510000,
          "proposer": {
            "address": "0x..."
          },
          "votes": [
            {
              "weight": "1000000000000000000",
              "support": 1 // 0=Against, 1=For, 2=Abstain
            }
          ]
        }
      ],
      "pageInfo": {
        "firstCursor": "cursor1",
        "lastCursor": "cursor2",
        "count": 100
      }
    }
  }
}
```

### 2.5 Tally Delegation Model

**Key Differences from Snapshot**:
1. **Native to Governor**: Delegation is built into the Governor contract
2. **Token-based**: Delegation is tied to token balance
3. **Block-based**: Voting power is determined at a specific block height
4. **On-chain**: All delegation is on-chain (no separate registry)

**Delegation Functions** (Governor contract):
```solidity
function delegate(address delegatee) external
function delegateBySig(address delegatee, uint nonce, uint expiry, uint8 v, bytes32 r, bytes32 s) external
function delegates(address account) external view returns (address)
function getVotes(address account, uint blockNumber) external view returns (uint96)
```

---

## Part 3: Integration Strategy

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Davos Platform                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (Davos-UI)                                        │
│  ├── Multi-source DAO selector                              │
│  ├── snapshot-utils.ts → snapshot-adapter.ts                │
│  ├── tally-utils.ts (NEW)                                   │
│  └── dao-utils.ts (enhanced with source routing)            │
│                                                             │
│  Backend (davos-mvp)                                        │
│  ├── proposal-api/proposal_analyzer.py (already supports)   │
│  ├── voter/snapshot_executor.ts                             │
│  ├── voter/tally_executor.ts (NEW)                          │
│  └── voter/fetcher.ts (enhanced)                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         ↓                                    ↓
    Snapshot API                         Tally API
    (Off-chain)                          (On-chain Governor)
```

### 3.2 Frontend Integration Points

#### **A. Constants & Configuration** (`Davos-UI/src/lib/constants.ts`)

**Add**:
```typescript
export const TALLY_API_URL = 'https://api.tally.xyz/query';
export const TALLY_API_KEY = import.meta.env.VITE_TALLY_API_KEY || 'your-api-key';

// Extend daoConfig to include Tally DAOs
export const daoConfig = {
  // Existing Snapshot DAOs
  aave: { 
    source: 'snapshot', 
    identifier: 'aavedao.eth',
    // ...
  },
  // New Tally DAOs
  uniswap_governor: {
    source: 'tally',
    identifier: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // Governor address
    chainId: CHAIN_IDS.ETHEREUM,
    // ...
  }
}
```

#### **B. Utility Functions** (`Davos-UI/src/lib/tally-utils.ts` - NEW)

Create new file with:
```typescript
// Tally GraphQL queries
export const TALLY_GOVERNOR_QUERY = `...`
export const TALLY_PROPOSALS_QUERY = `...`
export const TALLY_DELEGATION_QUERY = `...`

// Fetch functions
export async function fetchTallyGovernor(governorId: string)
export async function fetchTallyProposals(governorId: string, limit: number)
export async function fetchTallyDelegation(delegator: string, governorId: string)
export async function fetchTallyGraphQL(query: string, variables: Record<string, any>)
```

#### **C. DAO Utilities** (`Davos-UI/src/lib/dao-utils.ts` - ENHANCED)

**Modify**:
```typescript
export async function fetchDaoInfo(
  source: string = 'snapshot', 
  identifier: string = 'aave.eth'
): Promise<any> {
  if (source === 'snapshot') {
    return fetchSnapshotSpace(identifier);
  } else if (source === 'tally') {
    return fetchTallyGovernor(identifier);
  }
  throw new Error(`Unknown source: ${source}`);
}

export async function fetchProposals(
  source: string,
  identifier: string,
  limit: number = 300
): Promise<any> {
  if (source === 'snapshot') {
    return fetchSnapshotProposals(identifier, limit);
  } else if (source === 'tally') {
    return fetchTallyProposals(identifier, limit);
  }
  throw new Error(`Unknown source: ${source}`);
}
```

#### **D. Delegation Utilities** (`Davos-UI/src/lib/utils.ts` - ENHANCED)

**Add**:
```typescript
export async function getDelegationStatus(
  user: `0x${string}`,
  source: string,
  identifier: string
): Promise<{ exists: boolean; target: `0x${string}` | null }> {
  if (source === 'snapshot') {
    return getSnapshotDelegation(user, identifier);
  } else if (source === 'tally') {
    return getTallyDelegation(user, identifier);
  }
}

export async function delegateOnChain(
  client: PublicClient,
  source: string,
  identifier: string,
  delegator: `0x${string}`,
  delegatee: `0x${string}`,
  writeContractAsync: any
) {
  if (source === 'snapshot') {
    return delegateSnapshotOnChain(...);
  } else if (source === 'tally') {
    return delegateTallyOnChain(...);
  }
}
```

#### **E. React Hooks** (`Davos-UI/src/hooks/use-dao.ts` - ENHANCED)

**Modify existing hooks** to accept `source` parameter and route to appropriate fetcher.

### 3.3 Backend Integration Points

#### **A. Proposal Analyzer** (`davos-mvp/proposal-api/proposal_analyzer.py`)

**Already supports both!** The file already has:
- `fetch_snapshot_proposals()`
- `fetch_tally_proposals()`
- `analyze_proposals()` with source routing

**No changes needed** - just ensure Tally API key is configured.

#### **B. Vote Executor** (`davos-mvp/voter/src/snapshot_executor.ts`)

**Create** `davos-mvp/voter/src/tally_executor.ts`:
```typescript
import { ethers } from 'ethers';
import { KEYRING_GATEWAY_CONTRACT_ADDRESS, RPC_URL } from './config';
import logger from './logger';

// Governor contract ABI (simplified)
const GOVERNOR_ABI = [
  'function castVote(uint proposalId, uint8 support) external',
  'function castVoteBySig(uint proposalId, uint8 support, uint8 v, bytes32 r, bytes32 s) external',
];

export const tallyVote = async (signer: Address, tallyVote: any) => {
  try {
    const agent = await getAgentByKmsAddress(signer);
    if (!agent) {
      logger.error(`Agent not found for signer: ${signer}`);
      return;
    }

    const wallet = new ethers.Wallet(agent.privateKey, provider);
    const governorContract = new ethers.Contract(
      tallyVote.governorAddress,
      GOVERNOR_ABI,
      wallet
    );

    // Support: 0=Against, 1=For, 2=Abstain
    const tx = await governorContract.castVote(
      tallyVote.proposalId,
      tallyVote.support
    );
    
    logger.info(`Tally vote submitted: ${tx.hash}`);
  } catch (error) {
    logger.error(`Error voting on Tally: ${error}`);
  }
};

export async function watchTallyEvents(): Promise<void> {
  // Similar to watchSnapshotEvents but for Tally
}
```

#### **C. Fetcher** (`davos-mvp/voter/src/fetcher.ts` - ENHANCED)

**Add**:
```typescript
export async function fetchTallyProposals(governorId: string): Promise<TallyProposal[]> {
  // Similar to fetchProposals but for Tally
  // Use Tally GraphQL API
}
```

### 3.4 Data Transformation Layer

**Key Differences to Handle**:

| Aspect | Snapshot | Tally | Transformation |
|--------|----------|-------|-----------------|
| **Proposal ID** | Hex string | Numeric ID | Convert as needed |
| **Timestamp** | Unix epoch (seconds) | ISO 8601 string | Parse ISO to epoch |
| **Voting Choices** | Array of strings | Support enum (0/1/2) | Map enum to labels |
| **Proposal State** | Simple states | Complex Governor states | Normalize to common format |
| **Voting Power** | Strategy-based | Token balance | Normalize to common format |

**Create** `Davos-UI/src/lib/data-normalizer.ts`:
```typescript
export interface NormalizedProposal {
  id: string;
  title: string;
  description: string;
  state: 'active' | 'closed' | 'pending';
  startTime: number;
  endTime: number;
  choices: string[];
  scores: number[];
  source: 'snapshot' | 'tally';
}

export function normalizeSnapshotProposal(proposal: any): NormalizedProposal {
  // Transform Snapshot proposal to normalized format
}

export function normalizeTallyProposal(proposal: any): NormalizedProposal {
  // Transform Tally proposal to normalized format
}
```

---

## Part 4: Implementation Roadmap

### Phase 1: Foundation
- [ ] Add Tally constants and configuration
- [ ] Create `tally-utils.ts` with GraphQL queries
- [ ] Create data normalizer for unified data format
- [ ] Add Tally DAO to `daoConfig`

### Phase 2: Frontend Integration
- [ ] Enhance `dao-utils.ts` with source routing
- [ ] Update React hooks to support both sources
- [ ] Update UI components to handle both sources
- [ ] Add Tally delegation utilities

### Phase 3: Backend Integration
- [ ] Create `tally_executor.ts` for vote submission
- [ ] Enhance `fetcher.ts` for Tally proposals
- [ ] Update API endpoints to support source parameter
- [ ] Test end-to-end voting flow

### Phase 4: Testing & Optimization
- [ ] Unit tests for data transformation
- [ ] Integration tests for API calls
- [ ] E2E tests for voting flow
- [ ] Performance optimization

---

## Part 5: Key Differences & Considerations

### 5.1 Voting Mechanism

**Snapshot**:
- Off-chain voting via EIP-712 signatures
- No gas costs for voting
- Flexible voting strategies
- Instant results

**Tally**:
- On-chain voting via Governor contract
- Gas costs for voting transactions
- Standard OpenZeppelin Governor
- Voting power determined at block height

**Implication**: Need to handle gas estimation and transaction submission for Tally votes.

### 5.2 Delegation

**Snapshot**:
- Separate delegation registry contract
- Space-specific delegation
- Can delegate to multiple spaces independently

**Tally**:
- Built into Governor contract
- Governor-specific delegation
- Single delegation per token per Governor

**Implication**: Different contract interactions and UI flows.

### 5.3 Proposal Identification

**Snapshot**:
- Proposal ID is a hex string (hash-based)
- Example: `0xa3bc9590fd3af9f59fbad1296886da60c90853e25f1fc53110d9ebc8bd0618b6`

**Tally**:
- Proposal ID is numeric (sequential)
- Example: `42`

**Implication**: Need to handle both ID formats in UI and API.

### 5.4 API Authentication

**Snapshot**:
- Public API, no authentication required
- Rate limiting: ~100 requests/minute

**Tally**:
- Requires API key in headers
- Rate limiting: Depends on plan
- API key should be kept secure (environment variable)

**Implication**: Add API key management and error handling for rate limits.

### 5.5 Data Availability

**Snapshot**:
- Historical data available indefinitely
- Off-chain, so no block height constraints

**Tally**:
- Data tied to block heights
- Voting power determined at specific block
- May need to query historical blocks

**Implication**: Consider block height when querying historical data.

---

## Part 6: API Endpoint Mapping

### Frontend API Calls

| Current (Snapshot) | New (Multi-source) | Tally Equivalent |
|-------------------|-------------------|------------------|
| `GET /api/proposals?source=snapshot&identifier=aave.eth` | `GET /api/proposals?source=snapshot&identifier=aave.eth` | `GET /api/proposals?source=tally&identifier=0x...` |
| `GET /api/dao-info?source=snapshot&identifier=aave.eth` | `GET /api/dao-info?source=snapshot&identifier=aave.eth` | `GET /api/dao-info?source=tally&identifier=0x...` |
| `POST /api/delegate` | `POST /api/delegate?source=snapshot` | `POST /api/delegate?source=tally` |
| `POST /api/snapshot-vote` | `POST /api/vote?source=snapshot` | `POST /api/vote?source=tally` |

### Backend API Endpoints

**Existing** (already support both):
- `POST /api/proposal` - Analyze proposals (supports both sources)

**New/Enhanced**:
- `POST /api/vote?source=tally` - Submit Tally vote
- `GET /api/delegation?source=tally&delegator=0x...&governor=0x...` - Check Tally delegation

---

## Part 7: Error Handling & Edge Cases

### 7.1 Common Errors

| Error | Snapshot | Tally | Handling |
|-------|----------|-------|----------|
| **Invalid DAO ID** | Space not found | Governor not found | Return 404 with clear message |
| **API Rate Limit** | Rare | Possible | Implement exponential backoff |
| **Network Error** | Retry logic | Retry logic | Use same retry strategy |
| **Invalid Proposal ID** | Hex string validation | Numeric validation | Validate format before API call |
| **Insufficient Voting Power** | Off-chain check | On-chain check | Query voting power first |
| **Delegation Conflict** | Can delegate to multiple | Single delegation per Governor | Warn user before overwriting |

### 7.2 Edge Cases

1. **DAO with both Snapshot and Tally**: Handle in UI to let user choose
2. **Proposal state transitions**: Map Governor states to common format
3. **Block height queries**: Handle for historical voting power
4. **Gas estimation failures**: Provide fallback gas limits
5. **Signature expiry**: Handle for delegateBySig calls

---

## Summary of Required Changes

### Frontend (`Davos-UI`)
1. **New Files**:
   - `src/lib/tally-utils.ts` - Tally GraphQL queries and fetchers
   - `src/lib/data-normalizer.ts` - Unified data format

2. **Modified Files**:
   - `src/lib/constants.ts` - Add Tally constants and DAOs
   - `src/lib/dao-utils.ts` - Add source routing
   - `src/lib/utils.ts` - Add Tally delegation functions
   - `src/hooks/use-dao.ts` - Support both sources

### Backend (`davos-mvp`)
1. **New Files**:
   - `voter/src/tally_executor.ts` - Tally vote submission
   - `voter/src/tally_fetcher.ts` - Tally proposal fetching

2. **Modified Files**:
   - `voter/src/fetcher.ts` - Add Tally support
   - `proposal-api/proposal_analyzer.py` - Already supports both
   - API endpoints - Add source parameter support

### Configuration
1. Add `VITE_TALLY_API_KEY` environment variable
2. Add Tally DAOs to configuration
3. Update deployment scripts
