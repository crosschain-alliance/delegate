# Relayer Service

A service that listens for `Asked` events from the LLM Adapter smart contract and responds with LLM-generated answers.

It is possible to use different types of LLM services:
- OpenAI for speed.
- Acurast for security.

Each service can be configured and has been tested with different LLMs:

###### OpenAI
- gpt-4o-mini
- gpt-4o
- gpt-4.5-preview

###### Acurast
- [Qwen2.5-14B-Instruct-Q4_0_4_4](https://huggingface.co/bartowski/Qwen2.5-14B-Instruct-GGUF/blob/main/Qwen2.5-14B-Instruct-Q4_0_4_4.gguf)
- [Meta-Llama-3.1-8B-Instruct-Q4_0_4_4](https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/blob/main/Meta-Llama-3.1-8B-Instruct-Q4_0_4_4.gguf)
- [Qwen2.5.1-Coder-7B-Instruct-Q4_0_4_4](https://huggingface.co/bartowski/Qwen2.5.1-Coder-7B-Instruct-GGUF/blob/main/Qwen2.5.1-Coder-7B-Instruct-Q4_0_4_4.gguf)
- [Llama-3.2-3B-Instruct-Q4_0_4_4](https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/blob/main/Llama-3.2-3B-Instruct-Q4_0_4_4.gguf)
- [Qwen2.5-0.5B-Instruct-Q4_K_M](https://huggingface.co/bartowski/Qwen2.5-0.5B-Instruct-GGUF/blob/main/Qwen2.5-0.5B-Instruct-Q4_0_4_4.gguf)

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

Check `.env.example`

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
