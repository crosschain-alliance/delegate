import dotenv from 'dotenv';
import { DAOConfig } from './types';
import { Address } from 'viem';

dotenv.config();

// Validate required environment variables
if (!process.env.SNAPSHOT_HUB_URL || !process.env.RPC_URL || !process.env.DELEGATE_CONTRACT_ADDRESS || !process.env.KEYRING_GATEWAY_CONTRACT_ADDRESS) {
  throw new Error('Missing required environment variables. Check your .env file.');
}

export const SNAPSHOT_HUB_URL = process.env.SNAPSHOT_HUB_URL;
export const RPC_URL = process.env.RPC_URL;
export const PRIVATE_KEY = process.env.PRIVATE_KEY;
export const REL_CHAIN = process.env.REL_CHAIN;
export const DELEGATE_CONTRACT_ADDRESS = process.env.DELEGATE_CONTRACT_ADDRESS as Address; 
export const KEYRING_GATEWAY_CONTRACT_ADDRESS = process.env.KEYRING_GATEWAY_CONTRACT_ADDRESS as Address;

console.log('Delegate contract address:', DELEGATE_CONTRACT_ADDRESS);
console.log('Keyring gateway contract address:', KEYRING_GATEWAY_CONTRACT_ADDRESS);

// Cron schedule for fetching proposals (default: every day at 8am)
export const FETCH_SCHEDULE = process.env.FETCH_SCHEDULE || '0 8 * * *';

// How many hours before a proposal ends should we cast our vote
export const VOTE_HOURS_BEFORE_END = parseInt(process.env.VOTE_HOURS_BEFORE_END || '6', 10);

// MongoDB connection URI
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/davos-voter';

// API server port
export const API_PORT = parseInt(process.env.API_PORT || '3000', 10);

// Legacy setting - keeping for backward compatibility
export const VOTE_THRESHOLD_MINUTES = 720; // 12 hours before end

// List of DAOs to monitor
export const DAOS: DAOConfig[] = [
  {
    id: 'balancer.eth',
    name: 'Balancer',
    defaultVote: 1 // Vote for first option by default
  },
  {
    id: 'aave.eth',
    name: 'Aave',
    defaultVote: 1 // Vote for first option by default
  },
  {
    id: 'arbitrumfoundation.eth',
    name: 'Arbitrum',
    defaultVote: 1 // Vote for first option by default
  },
  {
    id: 'uniswapgovernance.eth',
    name: 'Uniswap',
    defaultVote: 1 // Vote for first option by default
  }
];