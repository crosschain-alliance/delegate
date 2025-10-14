import dotenv from 'dotenv';
import path from 'path';
import { DAOConfig } from './types';
import { Address } from 'viem';

dotenv.config();

// Load root .env if exists
dotenv.config({ path: '/app/root.env' });

// Validate required environment variables
if (!process.env.SNAPSHOT_HUB_URL || !process.env.RPC_URL || !process.env.DELEGATE_CONTRACT_ADDRESS || !process.env.KEYRING_GATEWAY_CONTRACT_ADDRESS) {
  throw new Error('Missing required environment variables. Check your .env file.');
}

// Override SNAPSHOT_HUB_URL if TEST_ENV is true
let snapshotHubUrl = process.env.SNAPSHOT_HUB_URL;
if (process.env.TEST_ENV === 'true') {
  snapshotHubUrl = 'http://test-env:5001/graphql';
}

export const SNAPSHOT_HUB_URL = snapshotHubUrl;
export const RPC_URL = process.env.RPC_URL;
export const PRIVATE_KEY = process.env.PRIVATE_KEY;
export const REL_CHAIN = process.env.REL_CHAIN;
export const DELEGATE_CONTRACT_ADDRESS = process.env.DELEGATE_CONTRACT_ADDRESS as Address; 
export const KEYRING_GATEWAY_CONTRACT_ADDRESS = process.env.KEYRING_GATEWAY_CONTRACT_ADDRESS as Address;

console.log('SNAPSHOT_HUB_URL:', SNAPSHOT_HUB_URL);
console.log('TEST_ENV:', process.env.TEST_ENV);
console.log('TEST_FETCH_SCHEDULE:', process.env.TEST_FETCH_SCHEDULE);
console.log('TEST_START_PROPOSAL:', process.env.TEST_START_PROPOSAL);
console.log('TEST_END_PROPOSAL:', process.env.TEST_END_PROPOSAL);

console.log('Delegate contract address:', DELEGATE_CONTRACT_ADDRESS);
console.log('Keyring gateway contract address:', KEYRING_GATEWAY_CONTRACT_ADDRESS);

// Cron schedule for fetching proposals (default: every day at 8am)
//export const FETCH_SCHEDULE = process.env.FETCH_SCHEDULE || '0 8 * * *';
let fetchSchedule = process.env.FETCH_SCHEDULE || '* * * * *';
if (process.env.TEST_ENV === 'true') {
  fetchSchedule = process.env.TEST_FETCH_SCHEDULE || '* * * * *';
}

export const FETCH_SCHEDULE = fetchSchedule;

// How many hours before a proposal ends should we cast our vote
export const VOTE_HOURS_BEFORE_END = parseInt(process.env.VOTE_HOURS_BEFORE_END || '6', 10);

// How often to check for pending votes (in milliseconds)
export const VOTE_POLLER_INTERVAL = parseInt(process.env.VOTE_POLLER_INTERVAL || '60000', 10);

// MongoDB connection URI
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://davos:voterpassword@mongodb:27017/davos-voter?authSource=admin';

// API server port
export const API_PORT = parseInt(process.env.API_PORT || '3000', 10);

// Legacy setting - keeping for backward compatibility
export const VOTE_THRESHOLD_MINUTES = 720; // 12 hours before end

// List of DAOs to monitor
export const DAOS: DAOConfig[] = process.env.TEST_ENV === 'true'
  ? [
      {
        id: 'DAO_test',
        name: 'DAO Test',
        defaultVote: 1
      }
    ]
  : [
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