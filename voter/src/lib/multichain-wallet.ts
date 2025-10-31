import { createWalletClient, createPublicClient, custom, http, Chain, WalletClient, PublicClient } from 'viem';
import {
  mainnet,
  arbitrum,
} from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import logger from '../logger';

/**
 * Supported Tally chains
 * Only includes chains actually used by configured Tally DAOs:
 * - Ethereum Mainnet (1): Uniswap Governor
 * - Arbitrum (42161): Arbitrum Governor and subDAOs
 */
export const TALLY_SUPPORTED_CHAINS: Record<number, Chain> = {
  [mainnet.id]: mainnet,
  [arbitrum.id]: arbitrum,
};

/**
 * RPC URLs for each chain (with fallbacks to public RPCs)
 */
const RPC_URLS: Record<number, string> = {
  [mainnet.id]: process.env.MAINNET_RPC_URL || 'https://eth.llamarpc.com',
  [arbitrum.id]: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
};

/**
 * Cache for wallet and public clients by chain ID
 */
const walletClientCache = new Map<string, WalletClient>();
const publicClientCache = new Map<number, PublicClient>();

/**
 * Get the chain object from governor ID (Tally format: eip155:chainId:governorAddress)
 */
export function getChainFromGovernorId(governorId: string): Chain {
  const parts = governorId.split(':');
  if (parts.length !== 3 || parts[0] !== 'eip155') {
    throw new Error(`Invalid governor ID format: ${governorId}. Expected format: eip155:chainId:address`);
  }

  const chainId = parseInt(parts[1], 10);
  const chain = TALLY_SUPPORTED_CHAINS[chainId];

  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}. Supported chains: ${Object.keys(TALLY_SUPPORTED_CHAINS).join(', ')}`);
  }

  return chain;
}

/**
 * Get the governor address from governor ID
 */
export function getAddressFromGovernorId(governorId: string): `0x${string}` {
  const parts = governorId.split(':');
  if (parts.length !== 3) {
    throw new Error(`Invalid governor ID format: ${governorId}`);
  }
  return parts[2] as `0x${string}`;
}

/**
 * Create a wallet client for a specific chain using a private key
 */
export function createMultiChainWalletClient(
  privateKey: `0x${string}`,
  chainId: number
): WalletClient {
  const cacheKey = `${privateKey.slice(0, 10)}-${chainId}`;

  // Check cache first
  if (walletClientCache.has(cacheKey)) {
    return walletClientCache.get(cacheKey)!;
  }

  const chain = TALLY_SUPPORTED_CHAINS[chainId];
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  const account = privateKeyToAccount(privateKey);
  const rpcUrl = RPC_URLS[chainId];

  if (!rpcUrl) {
    throw new Error(`No RPC URL configured for chain ${chainId} (${chain.name})`);
  }

  logger.info(`Creating wallet client for chain ${chain.name} (${chainId}) with RPC: ${rpcUrl}`);

  const client = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  // Cache the client
  walletClientCache.set(cacheKey, client);

  return client;
}

/**
 * Create a public client for reading contract data
 */
export function createMultiChainPublicClient(chainId: number): PublicClient {
  // Check cache first
  if (publicClientCache.has(chainId)) {
    return publicClientCache.get(chainId)!;
  }

  const chain = TALLY_SUPPORTED_CHAINS[chainId];
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  const rpcUrl = RPC_URLS[chainId];

  if (!rpcUrl) {
    throw new Error(`No RPC URL configured for chain ${chainId} (${chain.name})`);
  }

  const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  // Cache the client
  publicClientCache.set(chainId, client);

  return client;
}

/**
 * Create wallet and public clients from a Tally governor ID
 */
export function createClientsFromGovernorId(governorId: string, privateKey: `0x${string}`) {
  const chain = getChainFromGovernorId(governorId);
  const governorAddress = getAddressFromGovernorId(governorId);

  const walletClient = createMultiChainWalletClient(privateKey, chain.id);
  const publicClient = createMultiChainPublicClient(chain.id);

  return {
    walletClient,
    publicClient,
    chain,
    governorAddress,
  };
}

/**
 * Clear client caches (useful for testing or when switching networks)
 */
export function clearClientCache() {
  walletClientCache.clear();
  publicClientCache.clear();
  logger.info('Cleared wallet and public client caches');
}
