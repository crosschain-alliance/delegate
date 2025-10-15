# Tally Integration - Executive Summary

## Overview

This document summarizes the analysis of integrating Tally alongside Snapshot in the Davos platform.

---

## 🎯 Key Findings

### Current Snapshot Implementation
- **API**: GraphQL at `https://hub.snapshot.org/graphql`
- **Voting**: Off-chain via EIP-712 signatures
- **Delegation**: Separate registry contract
- **Proposal IDs**: Hex strings
- **Authentication**: None required

### Tally System
- **API**: GraphQL at `https://api.tally.xyz/query`
- **Voting**: On-chain via Governor contract
- **Delegation**: Built into Governor contract
- **Proposal IDs**: Numeric
- **Authentication**: API key required
- **Voting Cost**: Gas fees required

### Integration Approach
- **Strategy**: Multi-source routing with unified data format
- **Complexity**: Medium (data transformation layer needed)
- **Effort**: ~35 hours (~1 week)
- **Risk**: Low (parallel implementation, no breaking changes)

---

## 🔄 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface                           │
│  (Select DAO → View Proposals → Vote)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
   Snapshot                    Tally
   (Off-chain)                (On-chain)
        │                         │
        ├─ GraphQL API            ├─ GraphQL API
        ├─ EIP-712 Voting         ├─ Governor Voting
        └─ Registry Delegation    └─ Governor Delegation
```

---

## 📋 Implementation Checklist

### Phase 1: Foundation
- [ ] Add Tally constants to `constants.ts`
- [ ] Create `tally-utils.ts` with GraphQL queries
- [ ] Create `data-normalizer.ts` for unified format
- [ ] Add Tally DAOs to configuration
- [ ] Test Tally API connectivity

### Phase 2: Frontend
- [ ] Enhance `dao-utils.ts` with source routing
- [ ] Update React hooks in `use-dao.ts`
- [ ] Add Tally delegation functions to `utils.ts`
- [ ] Update UI components for multi-source
- [ ] Test data fetching from both sources

### Phase 3: Backend
- [ ] Create `tally_executor.ts` for vote submission
- [ ] Enhance `fetcher.ts` for Tally proposals
- [ ] Update API endpoints with source parameter
- [ ] Add Tally event watching
- [ ] Test vote submission flow

---

## 🔑 Critical Implementation Points

### 1. Data Normalization
**Problem**: Different data structures between Snapshot and Tally

**Solution**: Create unified `NormalizedProposal` interface
```typescript
interface NormalizedProposal {
  id: string;
  title: string;
  state: 'pending' | 'active' | 'closed';
  choices: string[];
  scores: number[];
  source: 'snapshot' | 'tally';
}
```

### 2. Source Routing
**Problem**: Need to route calls to correct API

**Solution**: Add source parameter throughout
```typescript
fetchDaoInfo(source: 'snapshot' | 'tally', identifier: string)
fetchProposals(source: 'snapshot' | 'tally', identifier: string)
delegateOnChain(source: 'snapshot' | 'tally', ...)
```

### 3. Delegation Differences
**Problem**: Different delegation mechanisms

**Solution**: Separate implementations with unified interface
```typescript
// Snapshot: Registry-based
getSnapshotDelegation(user, spaceId)

// Tally: Governor-based
getTallyDelegation(user, governorAddress)

// Unified
getDelegationStatus(user, source, identifier)
```

### 4. Voting Execution
**Problem**: Off-chain vs on-chain voting

**Solution**: Separate executors
```typescript
// Snapshot: EIP-712 signature
snapshotVote(signer, { space, proposal, choice })

// Tally: On-chain transaction
tallyVote(signer, { governorAddress, proposalId, support })
```

---

## ⚠️ Key Differences to Handle

| Aspect | Snapshot | Tally | Handling |
|--------|----------|-------|----------|
| **Proposal ID** | Hex string | Numeric | Format detection |
| **Timestamp** | Unix epoch | ISO 8601 | Parse and normalize |
| **Voting Choices** | String array | Enum (0/1/2) | Map to labels |
| **Proposal States** | Simple | Complex | Normalize to common |
| **Voting Cost** | Free | Gas fees | Show warning |
| **Delegation** | Registry | Governor | Different contracts |

---

## 🔐 Security Considerations

1. **API Key Management**
   - Store Tally API key in environment variables
   - Never commit to repository
   - Rotate periodically

2. **Contract Interactions**
   - Validate all contract addresses
   - Use ABI validation
   - Implement gas limits
   - Handle transaction failures

3. **Data Validation**
   - Validate all API responses
   - Check data types and ranges
   - Sanitize user inputs
   - Implement rate limiting

4. **Signature Handling**
   - Validate EIP-712 signatures
   - Check nonce and expiry
   - Implement replay protection

---

## 📊 Effort Breakdown

| Task |  Notes |
|------|-------|
| Constants & config | Straightforward |
| tally-utils.ts | GraphQL queries |
| data-normalizer.ts | Data transformation |
| dao-utils.ts | Source routing |
| React hooks | Multiple hooks |
| Delegation functions | Contract interactions |
| tally_executor.ts | Vote submission |
| Backend integration | API endpoints |
| Testing | Comprehensive |

---

## 🚀 Getting Started

### Step 1: Review Documentation
1. Read **TALLY_INTEGRATION_ANALYSIS.md** for full context
2. Use **TALLY_INTEGRATION_QUICK_REFERENCE.md** as reference
3. Review **TALLY_CODE_EXAMPLES.md** for implementation details

### Step 2: Setup
1. Create feature branch: `git checkout -b feat/integrate-tally`
2. Add Tally API key to environment variables
3. Create new files from code examples

### Step 3: Implement Phase 1
1. Add constants and configuration
2. Create tally-utils.ts
3. Create data-normalizer.ts
4. Test Tally API connectivity

### Step 4: Iterate Through Phases
1. Complete each phase with testing
2. Get code review at each phase
3. Merge to main after Phase 4

---

## 📈 Success Metrics

- ✅ Both Snapshot and Tally DAOs viewable
- ✅ Proposals from both sources display correctly
- ✅ Users can vote on both systems
- ✅ Delegation works for both sources
- ✅ Data is normalized and consistent
- ✅ Error handling is robust
- ✅ Performance is acceptable

---
