# DeleGate

DeleGate is a next-generation AI-powered voting delegate designed for DAOs and cooperatives. It utilizes a hexagonal architecture to ensure modularity and extensibility, with a core logic implemented as a **Monad smart contract**. The system integrates multiple adapters, including an LLM adapter (e.g., OpenAI or Acurast-Llama) and a KMS adapter (e.g., Keyring), enabling efficient and secure execution.

## Key Features

- **Automated DAO Voting:** Users set predefined principles and preferences, and DeleGate ensures their votes align accordingly.
- **AI-Powered Proposal Analysis:** Leverages LLMs to analyze DAO proposals and make informed voting decisions.
- **Secure Signing & Submission:** Uses a KMS adapter to securely sign and submit votes across multiple chains (e.g., Snapshot, Tally).
- **Override Mechanism:** Users have the ability to manually override the automated vote before the deadline.
- **High Throughput & Cost Efficiency:** Built on **Monad**, enabling predominantly on-chain AI operations with minimal overhead.

## Architecture

DeleGate follows a **hexagonal architecture** with three main components:

1. **Core (Monad Smart Contract)**  
   - Implements the core agent logic and decision-making mechanisms.

2. **Ports/Adapters**  
   - **LLM Adapter:** Integrates with OpenAI, Acurast-Llama, or other AI models for text understanding.
   - **KMS Adapter:** Uses Keyring or another key management system for secure signing.
   - Additional adapters can be added as needed for enhanced functionality.

3. **Relayer**  
   - Facilitates interaction between off-chain components (LLMs, KMS) and the on-chain smart contract.

## Monorepo Structure

The project follows a monorepo architecture, composed of the following components:

- **`ui/`** - A frontend interface allowing users to configure preferences and monitor votes.
- **`contracts/`** - The smart contract implementation running on Monad.
- **`relayer/`** - A backend service that interacts with the LLM and handles off-chain computations.
- **`acurast_llm/`** - An Acurast component to run LLMs in a secure and fully decentralized fashion.

## Why DeleGate?

Participating in DAO governance is often time-consuming, yet many users vote in predictable ways based on proposal content. DeleGate automates this process, ensuring:

- **Always-on participation:** Users never miss an important vote.
- **Trustworthy execution:** The agent votes in alignment with user-defined values.
- **Seamless integration:** Works across multiple DAOs and chains.

By leveraging **LLMs for analysis, KMS for security, and Monad for efficient execution**, DeleGate is a pioneering step towards **on-chain AI-driven governance**.

## Getting Started

### Prerequisites
- Node.js (for UI & Relayer)
- Rust & Cargo (for smart contracts)
- Docker (optional, for deployment)

### Installation
Clone the repository and install dependencies:
```sh
 git clone https://github.com/your-org/delegate.git
 cd delegate
```

#### UI
```sh
cd ui
npm install
npm start
```

#### Relayer
```sh
cd relayer
npm install
npm run start
```
###### Acurast_llm
Orchestrated directly by the relayer when configured.

#### Contracts
```sh
cd contracts
forge build
forge test
```

## Contributing
We welcome contributions! Feel free to open issues or submit pull requests to improve DeleGate.

## License
This project is licensed under the MIT License.