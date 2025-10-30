import { publicClient } from './lib/utils';
import { DELEGATE_CONTRACT_ADDRESS } from './config';
import DeleGateABI from './artifacts/DeleGate.json';
import logger from './logger';
import { refreshVoteDetailsForUser } from './db/service';

/**
 * Start watching for EthosDefined events from the DeleGate contract
 * When a user updates their ethos, automatically refresh their vote details
 */
export function startEthosWatcher(): void {
  logger.info('Starting EthosDefined event watcher...');
  
  const unwatch = publicClient.watchContractEvent({
    address: DELEGATE_CONTRACT_ADDRESS,
    abi: DeleGateABI.abi,
    eventName: 'EthosDefined',
    onLogs: async (logs) => {
      for (const log of logs) {
        try {
          // watchContractEvent provides parsed args
          const user = (log as any).args?.user as string;
          const ethosData = (log as any).args?.ethos as { ethos: string };
          
          if (!user || !ethosData) {
            logger.warn('EthosDefined event missing required data');
            continue;
          }
          
          logger.info(`EthosDefined event detected for user ${user}`);
          logger.info(`New ethos: ${ethosData.ethos.substring(0, 100)}...`);
          
          // Trigger refresh of vote details for this user with the ethos from the event
          const result = await refreshVoteDetailsForUser(user, ethosData.ethos);
          
          logger.info(`Successfully refreshed ${result.updatedCount} vote details for user ${user}`);
        } catch (error) {
          logger.error(`Error processing EthosDefined event: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    },
    onError: (error) => {
      logger.error(`EthosDefined watcher error: ${error.message}`);
    }
  });
  
  logger.info(`EthosDefined watcher started for contract ${DELEGATE_CONTRACT_ADDRESS}`);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Stopping EthosDefined watcher...');
    unwatch();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    logger.info('Stopping EthosDefined watcher...');
    unwatch();
    process.exit(0);
  });
}
