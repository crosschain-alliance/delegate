# Tally Integration - Quick Reference Guide

## 🎯 At a Glance

### Current State (Snapshot Only)
```
Davos Platform
├── Frontend: Snapshot GraphQL queries
├── Backend: Snapshot vote execution
└── On-chain: Snapshot Delegation Registry
```

### Target State (Snapshot + Tally)
```
Davos Platform
├── Frontend: Multi-source routing (Snapshot OR Tally)
├── Backend: Multi-source vote execution
└── On-chain: Snapshot Registry OR Governor Contract
```

---

## 📊 Snapshot vs Tally Comparison

### Core Differences

| Feature | Snapshot | Tally |
|---------|----------|-------|
| **Voting Type** | Off-chain | On-chain |
| **API Type** | GraphQL (public) | GraphQL (API key required) |
| **Endpoint** | `hub.snapshot.org/graphql` | `api.tally.xyz/query` |
| **DAO ID** | Space name (e.g., `aave.eth`) | Governor address (e.g., `0x...`) |
| **Proposal ID** | Hex hash | Numeric ID |
| **Voting Cost** | Free | Gas fees |
| **Delegation** | Separate registry | Built into Governor |
| **Voting Power** | Strategy-based | Token balance at block |
| **Proposal States** | Simple (active/closed) | Complex (7+ states) |

---

## 🔄 API Call Mapping

### Fetching DAO Info

**Snapshot**:
```typescript
// Query
query Space($id: String!) {
  space(id: $id) { id, name, members, proposalsCount, ... }
}

// Call
fetchGraphQL(SPACE_QUERY, { id: 'aave.eth' })
```

**Tally**:
```typescript
// Query
query Governor($input: GovernorInput!) {
  governor(input: $input) { id, name, token, votingPeriod, ... }
}

// Call
fetchTallyGraphQL(GOVERNOR_QUERY, { 
  input: { governorId: '0x...' } 
})
```

### Fetching Proposals

**Snapshot**:
```typescript
// Pagination: offset-based (skip/first)
query Proposals($space: String!, $limit: Int) {
  proposals(first: $limit, skip: 0, where: { space: $space }) { ... }
}
```

**Tally**:
```typescript
// Pagination: cursor-based (afterCursor)
query Proposals($input: ProposalsInput!) {
  proposals(input: $input) {
    nodes { ... }
    pageInfo { lastCursor, count }
  }
}
```

### Checking Delegation

**Snapshot**:
```typescript
// On-chain call to Snapshot Delegation Registry
readContract({
  address: SNAPSHOT_DELEGATION_REGISTRY,
  functionName: 'delegation',
  args: [user, keccak256(spaceId)]
})
```

**Tally**:
```typescript
// On-chain call to Governor contract
readContract({
  address: GOVERNOR_ADDRESS,
  functionName: 'delegates',
  args: [user]
})
```

### Submitting Votes

**Snapshot**:
```typescript
// Off-chain signature via EIP-712
const client = new snapshot.Client712(hub);
await client.vote(wallet, agent.address, {
  space: 'aave.eth',
  proposal: '0x...',
  choice: 1
})
```

**Tally**:
```typescript
// On-chain transaction
const tx = await governorContract.castVote(
  proposalId,  // numeric
  support      // 0=Against, 1=For, 2=Abstain
)
```

---

## 📁 File Structure Changes

### New Files to Create

```
Davos-UI/src/lib/
├── tally-utils.ts          # Tally GraphQL queries & fetchers
└── data-normalizer.ts      # Unified data format

davos-mvp/voter/src/
├── tally_executor.ts       # Tally vote submission
└── tally_fetcher.ts        # Tally proposal fetching
```

### Files to Modify

```
Davos-UI/src/lib/
├── constants.ts            # Add Tally constants & DAOs
├── dao-utils.ts            # Add source routing
└── utils.ts                # Add Tally delegation functions

Davos-UI/src/hooks/
└── use-dao.ts              # Support both sources

davos-mvp/voter/src/
└── fetcher.ts              # Add Tally support
```

---

## 🔌 Integration Points

### Frontend Data Flow

```
User selects DAO (Snapshot or Tally)
    ↓
dao-utils.fetchDaoInfo(source, identifier)
    ↓
    ├─ if source === 'snapshot' → snapshot-utils.fetchGraphQL()
    └─ if source === 'tally' → tally-utils.fetchTallyGraphQL()
    ↓
data-normalizer.normalize*Proposal()
    ↓
UI displays unified proposal format
```

### Backend Vote Flow

```
User submits vote
    ↓
API receives: { source, proposalId, choice, ... }
    ↓
    ├─ if source === 'snapshot' → snapshot_executor.snapshotVote()
    └─ if source === 'tally' → tally_executor.tallyVote()
    ↓
Vote submitted on-chain or off-chain
    ↓
Return transaction hash/receipt
```

---

## 🔑 Key Implementation Details

### 1. Data Normalization

**Problem**: Snapshot and Tally have different data structures

**Solution**: Create unified interface
```typescript
interface NormalizedProposal {
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
```

### 2. Source Routing

**Problem**: Need to route calls to correct API based on source

**Solution**: Add source parameter throughout
```typescript
// Before
fetchDaoInfo(identifier: string)

// After
fetchDaoInfo(source: 'snapshot' | 'tally', identifier: string)
```

### 3. Delegation Handling

**Problem**: Different delegation mechanisms

**Solution**: Separate functions with same interface
```typescript
// Snapshot: Separate registry
getSnapshotDelegation(user, spaceId)

// Tally: Governor contract
getTallyDelegation(user, governorAddress)

// Unified interface
getDelegationStatus(user, source, identifier)
```

### 4. Voting Execution

**Problem**: Different voting mechanisms (off-chain vs on-chain)

**Solution**: Separate executors
```typescript
// Snapshot: EIP-712 signature
snapshotVote(signer, { space, proposal, choice })

// Tally: On-chain transaction
tallyVote(signer, { governorAddress, proposalId, support })
```

---

## ⚠️ Critical Differences to Handle

### 1. Proposal IDs
```
Snapshot: "0xa3bc9590fd3af9f59fbad1296886da60c90853e25f1fc53110d9ebc8bd0618b6"
Tally:    "42"

→ Need format detection and conversion
```

### 2. Timestamps
```
Snapshot: Unix epoch (seconds) - 1759272763
Tally:    ISO 8601 string - "2023-06-06T15:56:32Z"

→ Need parsing and normalization
```

### 3. Voting Choices
```
Snapshot: ["For", "Against", "Abstain"]
Tally:    0 (Against), 1 (For), 2 (Abstain)

→ Need mapping between formats
```

### 4. Proposal States
```
Snapshot: "active", "closed", "pending"
Tally:    "Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"

→ Need state normalization
```

### 5. Gas Costs
```
Snapshot: Free (off-chain)
Tally:    Gas fees required (on-chain)

→ Need gas estimation and user warning
```

---

## 🔐 Security Checklist

- [ ] Store Tally API key in environment variables
- [ ] Validate all contract addresses
- [ ] Implement rate limiting
- [ ] Validate API responses
- [ ] Handle signature expiry
- [ ] Implement replay protection

---

## 📝 Configuration Changes

### Environment Variables

```bash
# Frontend (.env)
VITE_TALLY_API_KEY=your-api-key-here
VITE_SNAPSHOT_API_URL=https://hub.snapshot.org/graphql
VITE_TALLY_API_URL=https://api.tally.xyz/query

# Backend (.env)
TALLY_API_KEY=your-api-key-here
```

### DAO Configuration

```typescript
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
    identifier: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    chainId: CHAIN_IDS.ETHEREUM,
    // ...
  }
}
```
