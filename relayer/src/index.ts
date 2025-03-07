import { createPublicClient, createWalletClient, http } from 'viem';
import { foundry, sepolia, mainnet, arbitrum } from 'viem/chains';
import LLMAdapterABI from '../artifacts/LLMAdapter.json';
import { parseQuery } from './llmParsers/acurastParser';
import { privateKeyToAccount } from 'viem/accounts';
import 'dotenv/config';

if (!process.env.CONTRACT_ADDRESS || !process.env.PRIVATE_KEY || !process.env.RPC_URL || !process.env.CHAIN) {
  throw new Error('Missing environment variables. Check .env file');
}

const chains = {
  sepolia,
  mainnet,
  arbitrum,
  foundry
};

const chain = chains[process.env.CHAIN as keyof typeof chains];
if (!chain) {
  throw new Error(`Invalid chain: ${process.env.CHAIN}`);
}

const contractAddress = process.env.CONTRACT_ADDRESS as `0x${string}`;
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const rpcUrl = process.env.RPC_URL;

const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

const walletClient = createWalletClient({
  chain,
  transport: http(rpcUrl),
  account,
});

const abi = LLMAdapterABI.abi;

export const respond = async (promptId: any, response: string) => {
  await walletClient.writeContract({
    address: contractAddress,
    abi,
    functionName: 'respond',
    args: [promptId, response, '0x'],
  });
};

const handleAskedEvent = async (log: any) => {
  const { args } = log;
  if (!args) {
    console.error('Received log without args');
    return;
  }

  console.log(
    `Asked event received: queryId=${args.promptId}, llmQuery=${args.prompt}`
  );

  try {
    const response = await parseQuery(args.promptId, args.prompt);
    await respond(args.promptId, response);
  } catch (error) {
    console.error(`Error handling Ask event for promptId=${args.promptId}:`, error);
  }
};

const main = async () => {
  console.log(`Listening on ${rpcUrl}\nLLM Adapter address: ${contractAddress}`);
  
  const unwatch = publicClient.watchContractEvent({
    address: contractAddress,
    abi,
    eventName: 'Asked',
    onLogs: logs => {
      logs.forEach(log => {
        // Handle each event in a separate try-catch block
        handleAskedEvent(log).catch(error => {
          console.error('Fatal error handling Asked event:', error);
        });
      });
    },
  });

  const unwatchAnswered = publicClient.watchContractEvent({
    address: contractAddress,
    abi,
    eventName: 'Answered',
    onLogs: logs => {
      logs.forEach((log: any) => {
        try {
          const { args } = log;
          if (args) {
            console.log(
              `Answered event received: queryId=${args.promptId}, llmResponse=${args.response}`
            );
          }
        } catch (error) {
          console.error('Error handling Answered event:', error);
        }
      });
    },
  });

  // Handle process termination
  const cleanup = () => {
    console.log('Cleaning up...');
    unwatch();
    unwatchAnswered();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    cleanup();
  });

  // Keep the process running
  process.stdin.resume();
};

// Add error handling to the main function
main().catch(error => {
  console.error('Fatal error in main:', error);
  process.exit(1);
});
