# Tally Integration - Architecture Diagrams

## 1. Current Architecture (Snapshot Only)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Davos Platform                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Frontend (Davos-UI)                         │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐     │   │
│  │  │  React Components                               │     │   │
│  │  │  - Dashboard                                    │     │   │
│  │  │  - Proposals List                               │     │   │
│  │  │  - Voting Interface                             │     │   │
│  │  └─────────────────────────────────────────────────┘     │   │
│  │                      ↓                                   │   │
│  │  ┌─────────────────────────────────────────────────┐     │   │
│  │  │  React Hooks (use-dao.ts)                       │     │   │
│  │  │  - useAllProposals()                            │     │   │
│  │  │  - useDaoInfo()                                 │     │   │
│  │  │  - useGraphQL()                                 │     │   │
│  │  └─────────────────────────────────────────────────┘     │   │
│  │                      ↓                                   │   │
│  │  ┌─────────────────────────────────────────────────┐     │   │
│  │  │  Utilities (snapshot-utils.ts, utils.ts)        │     │   │
│  │  │  - fetchGraphQL()                               │     │   │
│  │  │  - fetchAllProposals()                          │     │   │
│  │  │  - getDelegationStatus()                        │     │   │
│  │  │  - delegateOnChain()                            │     │   │
│  │  └─────────────────────────────────────────────────┘     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Backend (davos-mvp)                         │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐     │   │
│  │  │  API Server (voter/src/api/server.ts)           │     │   │
│  │  │  - POST /api/snapshot-vote                      │     │   │
│  │  │  - GET /api/proposals                           │     │   │
│  │  └─────────────────────────────────────────────────┘     │   │
│  │                      ↓                                   │   │
│  │  ┌─────────────────────────────────────────────────┐     │   │
│  │  │  Vote Executor (snapshot_executor.ts)           │     │   │
│  │  │  - snapshotVote()                               │     │   │
│  │  │  - watchSnapshotEvents()                        │     │   │
│  │  └─────────────────────────────────────────────────┘     │   │
│  │                      ↓                                   │   │
│  │  ┌─────────────────────────────────────────────────┐     │   │
│  │  │  Fetcher (fetcher.ts)                           │     │   │
│  │  │  - fetchProposals()                             │     │   │
│  │  └─────────────────────────────────────────────────┘     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │  Snapshot GraphQL   │
                    │  hub.snapshot.org   │
                    └─────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │  Snapshot Registry  │
                    │  (On-chain)         │
                    └─────────────────────┘
```

---

## 2. Target Architecture (Snapshot + Tally)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Davos Platform                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Frontend (Davos-UI)                         │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐     │   │
│  │  │  React Components                               │     │   │
│  │  │  - Dashboard (Multi-source)                     │     │   │
│  │  │  - Proposals List (Snapshot + Tally)            │     │   │
│  │  │  - Voting Interface (Source-aware)              │     │   │
│  │  └─────────────────────────────────────────────────┘     │   │
│  │                      ↓                                   │   │
│  │  ┌─────────────────────────────────────────────────┐     │   │
│  │  │  React Hooks (use-dao.ts - ENHANCED)            │     │   │
│  │  │  - useProposals(source, identifier)             │     │   │
│  │  │  - useDaoInfo(source, identifier)               │     │   │
│  │  │  - useMultipleDaos(daos[])                      │     │   │
│  │  └─────────────────────────────────────────────────┘     │   │
│  │                      ↓                                   │   │
│  │  ┌─────────────────────────────────────────────────┐     │   │
│  │  │  Utilities (ENHANCED)                           │     │   │
│  │  │  ┌──────────────────────────────────────────┐   │     │   │
│  │  │  │ snapshot-utils.ts                        │   │     │   │
│  │  │  │ - fetchGraphQL()                         │   │     │   │
│  │  │  │ - fetchAllProposals()                    │   │     │   │
│  │  │  └──────────────────────────────────────────┘   │     │   │
│  │  │  ┌──────────────────────────────────────────┐   │     │   │
│  │  │  │ tally-utils.ts (NEW)                     │   │     │   │
│  │  │  │ - fetchTallyGraphQL()                    │   │     │   │
│  │  │  │ - fetchTallyProposals()                  │   │     │   │
│  │  │  │ - fetchTallyGovernor()                   │   │     │   │
│  │  │  └──────────────────────────────────────────┘   │     │   │
│  │  │  ┌──────────────────────────────────────────┐   │     │   │
│  │  │  │ data-normalizer.ts (NEW)                 │   │     │   │
│  │  │  │ - normalizeSnapshotProposal()            │   │     │   │
│  │  │  │ - normalizeTallyProposal()               │   │     │   │
│  │  │  └──────────────────────────────────────────┘   │     │   │
│  │  │  ┌──────────────────────────────────────────┐   │     │   │
│  │  │  │ dao-utils.ts (ENHANCED)                  │   │     │   │
│  │  │  │ - fetchDaoInfo(source, identifier)       │   │     │   │
│  │  │  │ - fetchProposals(source, identifier)     │   │     │   │
│  │  │  └──────────────────────────────────────────┘   │     │   │
│  │  │  ┌──────────────────────────────────────────┐   │     │   │
│  │  │  │ utils.ts (ENHANCED)                      │   │     │   │
│  │  │  │ - getDelegationStatus(source, ...)       │   │     │   │
│  │  │  │ - delegateOnChain(source, ...)           │   │     │   │
│  │  │  └──────────────────────────────────────────┘   │     │   │
│  │  └─────────────────────────────────────────────────┘     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Backend (davos-mvp)                         │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐     │   │
│  │  │  API Server (voter/src/api/server.ts)           │     │   │
│  │  │  - POST /api/vote?source=snapshot|tally         │     │   │
│  │  │  - GET /api/proposals?source=snapshot|tally     │     │   │
│  │  └─────────────────────────────────────────────────┘     │   │
│  │                      ↓                                   │   │
│  │  ┌──────────────────────────────────────────────┐        │   │
│  │  │  Vote Executors                              │        │   │
│  │  │  ┌────────────────────────────────────────┐  │        │   │
│  │  │  │ snapshot_executor.ts                   │  │        │   │
│  │  │  │ - snapshotVote()                       │  │        │   │
│  │  │  │ - watchSnapshotEvents()                │  │        │   │
│  │  │  └────────────────────────────────────────┘  │        │   │
│  │  │  ┌────────────────────────────────────────┐  │        │   │
│  │  │  │ tally_executor.ts (NEW)                │  │        │   │
│  │  │  │ - tallyVote()                          │  │        │   │
│  │  │  │ - watchTallyEvents()                   │  │        │   │
│  │  │  └────────────────────────────────────────┘  │        │   │
│  │  └──────────────────────────────────────────────┘        │   │
│  │                      ↓                                   │   │
│  │  ┌──────────────────────────────────────────────┐        │   │
│  │  │  Fetchers                                    │        │   │
│  │  │  ┌────────────────────────────────────────┐  │        │   │
│  │  │  │ fetcher.ts (ENHANCED)                  │  │        │   │
│  │  │  │ - fetchProposals(source, identifier)   │  │        │   │
│  │  │  │ - fetchSnapshotProposals()             │  │        │   │
│  │  │  │ - fetchTallyProposals()                │  │        │   │
│  │  │  └────────────────────────────────────────┘  │        │   │
│  │  └──────────────────────────────────────────────┘        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────────────────────┐
                    │  Snapshot GraphQL                   │
                    │  hub.snapshot.org/graphql           │
                    └─────────────────────────────────────┘
                              ↓
                    ┌─────────────────────────────────────┐
                    │  Snapshot Delegation Registry       │
                    │  (On-chain Contract)                │
                    └─────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │  Tally GraphQL                      │
                    │  api.tally.xyz/query                │
                    └─────────────────────────────────────┘
                              ↓
                    ┌─────────────────────────────────────┐
                    │  Governor Contracts                 │
                    │  (On-chain Voting & Delegation)     │
                    └─────────────────────────────────────┘
```

---

## 3. Data Flow: Fetching Proposals

### Snapshot Flow
```
User selects Snapshot DAO
        ↓
useProposals('snapshot', 'aave.eth')
        ↓
fetchProposals('snapshot', 'aave.eth')
        ↓
fetchAllProposals('aave.eth')
        ↓
fetchGraphQL(PROPOSALS_QUERY, { space: 'aave.eth' })
        ↓
POST https://hub.snapshot.org/graphql
        ↓
Parse response
        ↓
normalizeSnapshotProposal() for each proposal
        ↓
Return NormalizedProposal[]
        ↓
Display in UI
```

### Tally Flow
```
User selects Tally DAO
        ↓
useProposals('tally', '0x...')
        ↓
fetchProposals('tally', '0x...')
        ↓
fetchAllTallyProposals('0x...')
        ↓
fetchTallyGraphQL(PROPOSALS_QUERY, { governorId: '0x...' })
        ↓
POST https://api.tally.xyz/query (with API key)
        ↓
Parse response (handle cursor pagination)
        ↓
normalizeTallyProposal() for each proposal
        ↓
Return NormalizedProposal[]
        ↓
Display in UI
```

---

## 4. Data Flow: Voting

### Snapshot Voting Flow
```
User clicks "Vote"
        ↓
Collect vote data: { space, proposal, choice }
        ↓
POST /api/vote?source=snapshot
        ↓
Backend receives vote request
        ↓
snapshotVote(signer, { space, proposal, choice })
        ↓
Get agent private key from KMS
        ↓
Create ethers.Wallet
        ↓
Create snapshot.Client712
        ↓
client.vote() - EIP-712 signature
        ↓
Submit to Snapshot hub
        ↓
Return receipt
        ↓
Display success message
```

### Tally Voting Flow
```
User clicks "Vote"
        ↓
Collect vote data: { governorAddress, proposalId, support }
        ↓
POST /api/vote?source=tally
        ↓
Backend receives vote request
        ↓
tallyVote(signer, { governorAddress, proposalId, support })
        ↓
Get agent private key from KMS
        ↓
Create ethers.Wallet
        ↓
Create Governor contract instance
        ↓
governorContract.castVote(proposalId, support)
        ↓
Submit on-chain transaction
        ↓
Wait for confirmation
        ↓
Return receipt
        ↓
Display success message
```

---

## 5. Data Transformation Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                   Raw API Response                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Snapshot Response          │  Tally Response               │
│  ─────────────────────      │  ──────────────────           │
│  {                          │  {                            │
│    id: "0xabc...",          │    id: "42",                  │
│    title: "...",            │    metadata: {                │
│    body: "...",             │      title: "...",            │
│    choices: [...],          │      description: "..."       │
│    start: 1234567890,       │    },                         │
│    end: 1234567900,         │    block: {                   │
│    state: "active",         │      timestamp: "2023-..."    │
│    scores: [100, 200],      │    },                         │
│    ...                      │    state: "Active",           │
│  }                          │    voteStats: {...}           │
│                             │  }                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │ data-normalizer.ts  │
                    │                     │
                    │ normalize*Proposal()│
                    └─────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Normalized Proposal Format                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  {                                                          │
│    id: "string",                                            │
│    title: "string",                                         │
│    description: "string",                                   │
│    state: "pending" | "active" | "closed",                  │
│    startTime: number,                                       │
│    endTime: number,                                         │
│    choices: ["Against", "For", "Abstain"],                  │
│    scores: [100, 200, 50],                                  │
│    totalVotes: 350,                                         │
│    author: "0x...",                                         │
│    source: "snapshot" | "tally",                            │
│    sourceData: {...}                                        │
│  }                                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │   React Component   │
                    │   (Display Unified) │
                    └─────────────────────┘
```

---

## 6. Delegation Flow

### Snapshot Delegation
```
User wants to delegate
        ↓
getDelegationStatus('snapshot', user, spaceId)
        ↓
Read from Snapshot Delegation Registry
        ↓
registry.delegation(user, keccak256(spaceId))
        ↓
Return current delegatee
        ↓
User selects new delegatee
        ↓
delegateOnChain('snapshot', spaceId, user, delegatee)
        ↓
registry.setDelegate(keccak256(spaceId), delegatee)
        ↓
Submit transaction
        ↓
Confirm delegation
```

### Tally Delegation
```
User wants to delegate
        ↓
getDelegationStatus('tally', user, governorAddress)
        ↓
Read from Governor contract
        ↓
governor.delegates(user)
        ↓
Return current delegatee
        ↓
User selects new delegatee
        ↓
delegateOnChain('tally', governorAddress, user, delegatee)
        ↓
governor.delegate(delegatee)
        ↓
Submit transaction
        ↓
Confirm delegation
```

---

## 7. Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    API Call                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │  Response OK?       │
                    └────────┬────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                   YES               NO
                    │                 │
                    ↓                 ↓
            ┌──────────────┐  ┌──────────────────┐
            │ Parse Data   │  │ Check Error Type │
            └──────────────┘  └────────┬─────────┘
                    ↓                  │
            ┌──────────────┐  ┌────────┴────────────────┐
            │ Validate     │  │                         │
            │ Response     │  ├─ API Key Error          │
            └──────────────┘  ├─ Rate Limit             │
                    ↓         ├─ Not Found              │
            ┌──────────────┐  ├─ Network Error          │
            │ Transform    │  ├─ Other Error            │
            │ Data         │  └─────────────────────────┘
            └──────────────┘         ↓
                    ↓         ┌────────────────────┐
            ┌──────────────┐  │ Show User-Friendly |
            │ Return       │  │ Error Message      |
            │ Normalized   │  └────────────────────┘
            │ Data         │         │
            └──────────────┘         ↓
                    ↓         ┌──────────────────┐
                    └────────→│ Log Error        │
                              │ for Debugging    │
                              └──────────────────┘
```

---

## 8. File Structure Changes

### New Files
```
Davos-UI/src/lib/
├── tally-utils.ts          ← NEW: Tally GraphQL queries
└── data-normalizer.ts      ← NEW: Unified data format

davos-mvp/voter/src/
├── tally_executor.ts       ← NEW: Tally vote submission
└── tally_fetcher.ts        ← NEW: Tally proposal fetching
```

### Modified Files
```
Davos-UI/src/lib/
├── constants.ts            ← ADD: Tally constants
├── dao-utils.ts            ← ENHANCE: Source routing
└── utils.ts                ← ENHANCE: Tally delegation

Davos-UI/src/hooks/
└── use-dao.ts              ← ENHANCE: Multi-source support

davos-mvp/voter/src/
└── fetcher.ts              ← ENHANCE: Tally support
```

---

## 9. State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    React Query Cache                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Query Keys:                                                │
│  ├─ ['daoInfo', 'snapshot', 'aave.eth']                     │
│  ├─ ['daoInfo', 'tally', '0x...']                           │
│  ├─ ['proposals', 'snapshot', 'aave.eth', 300]              │
│  ├─ ['proposals', 'tally', '0x...', 300]                    │
│  ├─ ['delegationStatus', 'snapshot', user, spaceId]         │
│  └─ ['delegationStatus', 'tally', user, governorAddress]    │
│                                                             │
│  Stale Time: 5 minutes                                      │
│  GC Time: 24 hours                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │  Component State    │
                    │                     │
                    │  - selectedSource   │
                    │  - selectedDAO      │
                    │  - proposals[]      │
                    │  - loading          │
                    │  - error            │
                    └─────────────────────┘
```
