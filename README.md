# DeleGate



## Projects

- `llmAdapter`: Solidity smart contract for handling LLM queries and responses
- `delegateRelayer`: TypeScript service for relaying queries to LLM providers

## Prerequisites

- Node.js v18+
- npm v11+
- Foundry

## Installation

1. Install Foundry (if not already installed):
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. Install project dependencies:
```bash
npm install
```

## Development

### Build
Build all projects:
```bash
npm run build
```

### Test
Run all tests:
```bash
npm run test
```

### Local Development
1. Start local blockchain:
```bash
npm run dev:anvil
```

2. In a separate terminal, deploy contracts:
```bash
npm run dev:deploy
```

### Code Quality

Format code:
```bash
npm run format
```

Lint code:
```bash
npm run lint
```

## Project Structure

```
.
├── llmAdapter/           # Solidity smart contracts
│   ├── src/             # Contract source files
│   ├── test/            # Contract tests
│   └── script/          # Deployment scripts
│
└── delegateRelayer/     # TypeScript relayer service
    ├── src/             # Service source files
    └── script/          # Test scripts
```

## Environment Variables

Create a `.env` file in the root directory:
```bash
OPENAI_API_KEY=your_api_key_here
```

## License

MIT