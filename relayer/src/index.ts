import { createPublicClient, createWalletClient, http } from 'viem';
import { foundry } from 'viem/chains';
import LLMAdapterABI from '../../contracts/out/LLMAdapter.sol/LLMAdapter.json';
import { parseQuery } from './llmParsers/openAiParser';
import { privateKeyToAccount } from 'viem/accounts';

const contractAddress = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';
const account = privateKeyToAccount(
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
);
const rpcUrl = 'http://127.0.0.1:8545';

const publicClient = createPublicClient({
  chain: foundry,
  transport: http(rpcUrl),
});

const walletClient = createWalletClient({
  chain: foundry,
  transport: http(rpcUrl),
  account,
});

const abi = LLMAdapterABI.abi;

export const answer = async (promptId: string, response: string) => {
  await walletClient.writeContract({
    address: contractAddress,
    abi,
    functionName: 'answer',
    args: [BigInt(promptId), response],
  });
};

const main = async () => {
  console.log(`Listening on ${rpcUrl}\nLLM Adapter address: ${contractAddress}`);
  publicClient.watchContractEvent({
    address: contractAddress,
    abi,
    eventName: 'Asked',
    onLogs: logs => {
      logs.forEach(async (log: any) => {
        const { args } = log;
        if (args) {
          console.log(
            `Asked event received: queryId=${args.promptId}, llmQuery=${args.prompt}`
          );
          const response = await parseQuery(args.prompt);
          answer(args.promptId, response).catch(console.error);
        }
      });
    },
  });

  publicClient.watchContractEvent({
    address: contractAddress,
    abi,
    eventName: 'Answered',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const { args } = log;
        if (args) {
          console.log(
            `Answered event received: queryId=${args.promptId}, llmResponse=${args.response}`
          );
        }
      });
    },
  });

  // Keep the process running
  process.stdin.resume();
};

main().catch(console.error);
