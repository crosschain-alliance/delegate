import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createPublicClient, createWalletClient, http } from 'viem';
import { foundry } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import LLMAdapterABI from '../../contracts/out/LLMAdapter.sol/LLMAdapter.json';
import { parseQuery } from '../src/llmParsers/openAiParser';
import { respond } from '../src/index';

describe('Relayer', () => {
  const rpcUrl = 'http://127.0.0.1:8545';
  const account = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
  let publicClient: any;
  let walletClient: any;
  const contractAddress = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';

  beforeAll(async () => {
    publicClient = createPublicClient({
      chain: foundry,
      transport: http(rpcUrl),
    });

    walletClient = createWalletClient({
      chain: foundry,
      transport: http(rpcUrl),
      account,
    });
  });

  it('should handle Ask events', async () => {
    const contractAddress = process.env.CONTRACT_ADDRESS as `0x${string}`;
    expect(contractAddress).toBeDefined();
    expect(contractAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    
    try {
      // ask
      const tx = await walletClient.writeContract({
        address: contractAddress,
        abi: LLMAdapterABI.abi,
        functionName: 'ask',
        args: ['Test query'],
      });

      // Wait for transaction to be mined
      await publicClient.waitForTransactionReceipt({ hash: tx });

      // Check for events
      const events = await publicClient.getContractEvents({
        address: contractAddress,
        abi: LLMAdapterABI.abi,
        eventName: 'Asked',
        fromBlock: 0n,
      });

      console.log(events)
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].args.prompt).toBe('Test query');
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });

    // it('should handle QueryCall events', async () => {
    //     expect(contractAddress).toBeDefined();
    //     expect(contractAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);

    //     try {
    //         // Mock parseQuery and respond functions
    //         const parseQueryMock = vi.spyOn(parseQuery, 'default').mockResolvedValue('Test response');
    //         const respondMock = vi.spyOn(respond, 'default').mockResolvedValue(undefined);

    //         // Send a test query
    //         const tx = await walletClient.writeContract({
    //             address: contractAddress,
    //             abi: LLMAdapterABI.abi,
    //             functionName: 'query',
    //             args: ['Test query'],
    //         });

    //         // Wait for transaction to be mined
    //         await publicClient.waitForTransactionReceipt({ hash: tx });

    //         // Check for events
    //         const events = await publicClient.getContractEvents({
    //             address: contractAddress,
    //             abi: LLMAdapterABI.abi,
    //             eventName: 'QueryCall',
    //             fromBlock: 0n,
    //         });

    //         expect(events.length).toBeGreaterThan(0);
    //         expect(events[0].args.llmQuery).toBe('Test query');

    //         // Simulate event handling
    //         await publicClient.watchContractEvent({
    //             address: contractAddress,
    //             abi: LLMAdapterABI.abi,
    //             eventName: 'QueryCall',
    //             onLogs: logs => {
    //                 logs.forEach(async (log: any) => {
    //                     const { args } = log;
    //                     if (args) {
    //                         const response = await parseQuery(args.llmQuery);
    //                         await respond(args.uniqueNumber, response);
    //                     }
    //                 });
    //             },
    //         });

    //         expect(parseQueryMock).toHaveBeenCalledWith('Test query');
    //         expect(respondMock).toHaveBeenCalledWith(events[0].args.uniqueNumber, 'Test response');

    //         parseQueryMock.mockRestore();
    //         respondMock.mockRestore();
    //     } catch (error) {
    //         console.error('Test failed:', error);
    //         throw error;
    //     }
    // });

    // it('should handle QueryResponse events', async () => {
    //     try {
    //         // Send a test response
    //         const tx = await walletClient.writeContract({
    //             address: contractAddress,
    //             abi: LLMAdapterABI.abi,
    //             functionName: 'respond',
    //             args: [1n, 'Test response'],
    //         });

    //         // Wait for transaction to be mined
    //         await publicClient.waitForTransactionReceipt({ hash: tx });

    //         // Check for events
    //         const events = await publicClient.getContractEvents({
    //             address: contractAddress,
    //             abi: LLMAdapterABI.abi,
    //             eventName: 'QueryResponse',
    //             fromBlock: 0n,
    //         });

    //         expect(events.length).toBeGreaterThan(0);
    //         expect(events[0].args.llmResponse).toBe('Test response');
    //     } catch (error) {
    //         console.error('Test failed:', error);
    //         throw error;
    //     }
    // });
});