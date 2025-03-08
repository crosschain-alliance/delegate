# Relayer Service

A service that listens for `Asked` events from the LLM Adapter smart contract and responds with LLM-generated answers.

## Prerequisites

- Node.js v18+
- Docker (optional)
- Access to an Ethereum RPC endpoint
- OpenAI API key (or other LLM provider)

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Build and start
npm run build
npm start
```

## Docker Support

```bash
# Build container
docker compose build

# Run service
docker compose up -d

# View logs
docker compose logs -f relayer
```

## Environment Variables

```env
CONTRACT_ADDRESS=0x...  # LLM Adapter contract address
PRIVATE_KEY=0x...      # Private key for transaction signing
RPC_URL=https://...    # Ethereum RPC endpoint
CHAIN=sepolia          # Network (sepolia, mainnet, arbitrum, foundry)
```

## Development

```bash
# Start in development mode
npm run dev

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Lint code
npm run lint
```
