import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { 
  addAgent, 
  addAgentToSpace, 
  removeAgentFromSpace, 
  getAllAgents, 
  getAgentsForSpace, 
  getAllActiveSpaces,
  isAgentInSpace,
  getAgentById,
  getAgentByAddress,
  getScheduledVotes,
  getScheduledVoteById,
  countScheduledVotes,
  getUpcomingVotes,
  getVoteStatistics,
  markVoteCompleted
} from '../db/service';
import logger from '../logger';
import { deployKmsAdapter, getAgentAccountFromAddress, getAgentsByUserAddress, getKmsAddress, publicClient, walletClient } from '../lib/utils';
import { Address } from 'viem';
import DeleGateABI from '../artifacts/DeleGate.json';
import { DELEGATE_CONTRACT_ADDRESS, KEYRING_GATEWAY_CONTRACT_ADDRESS } from '../config';
import { IAgent } from '../db/models';
import { KmsDeployError } from '../lib/errors';
import { runFetchAndSchedule } from '../scheduler';
import { 
  processProposalsForVoting, 
  startVotePollingService,
  castVote 
} from '../voter';
import { SnapshotProposal } from '../types';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Get all agents
app.get('/agents', async (req, res) => {
  try {
    const agents = await getAllAgents();
    res.status(200).json(agents.map(agent => ({
      id: agent._id,
      address: agent.address,
      name: agent.name
    })));
  } catch (error) {
    logger.error(`API error: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all spaces with active agents
app.get('/spaces', async (req, res) => {
  try {
    const spaces = await getAllActiveSpaces();
    res.status(200).json(spaces);
  } catch (error) {
    logger.error(`API error: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get agents for a specific space
app.get('/spaces/:spaceId/agents', async (req, res) => {
  try {
    const spaceId = req.params.spaceId;
    const agentsForSpace = await getAgentsForSpace(spaceId);
    
    res.status(200).json(agentsForSpace.map(item => ({
      id: item.agent._id,
      address: item.agent.address,
      name: item.agent.name,
      defaultVote: item.defaultVote
    })));
  } catch (error) {
    logger.error(`API error: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add an agent to a space
app.post('/spaces/:spaceId/agents', async (req, res) => {
  try {
    const spaceId = req.params.spaceId;
    const { agentId, existing, defaultVote } = req.body;
    
    if (!agentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const agent = await getAgentById(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    let inSpace = false;

    try {
      // Call isSubscribed function on the delegate contract to check subscription status
      inSpace = await publicClient.readContract({
        address: DELEGATE_CONTRACT_ADDRESS,
        abi: DeleGateABI.abi,
        functionName: 'isSubscribed',
        args: [spaceId, agent.userAddress || agent.address, agent.address]
      }) as boolean;
      
      logger.info(`Agent ${agent.address} subscription status for Space ${spaceId}: ${inSpace ? 'Subscribed' : 'Not subscribed'}`);
    } catch (error) {
      logger.warn(`Failed to check if agent is subscribed: ${error instanceof Error ? error.message : String(error)}`);
      // If there's an error checking subscription, assume it's not subscribed
      inSpace = false;
    }

    let hash;

    console.log('inSpace', inSpace)
    if (!inSpace) {
      try {
        // Call subscribe function on the delegate contract to ensure the agent is subscribed as a module
        hash = await walletClient.writeContract({
          address: DELEGATE_CONTRACT_ADDRESS,
          abi: DeleGateABI.abi,
          functionName: 'subscribe',
          args: [spaceId, agent.userAddress, agent.address],
        });
        
        logger.info(`Subscribed agent ${agent.address} to Space ${spaceId}, tx: ${hash}`);
        
        // Wait for transaction to be mined
        await publicClient.waitForTransactionReceipt({ hash });
      } catch (error) {
        logger.error(`Failed to subscribe agent: ${error instanceof Error ? error.message : String(error)}`);
        // Return the agent info anyway, even if subscription failed
        return res.status(500).json({
          id: agentId,
          address: agent.address,
          subscriptionError: error instanceof Error ? error.message : String(error)
        });
      }
    }
    const success = await addAgentToSpace(agentId, spaceId, defaultVote);
    
    if (success) {
      // Trigger proposal fetching and scheduling for the new agent
      console.log('Fetching and scheduling proposals for the new agent');
      runFetchAndSchedule().catch(err => {
        logger.error(`Failed to run scheduler after adding agent: ${err.message}`);
      });

      return res.status(201).json({ message: 'Agent added to space successfully', subscribeTx: hash });
    }
    
    return res.status(400).json({ error: 'Failed to add agent to space' });
  } catch (error) {
    logger.error(`API error: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove an agent from a space
app.delete('/spaces/:spaceId/users/:userAddress', async (req, res) => {
  try {
    const { spaceId, userAddress } = req.params;

    let userSubscriptions;
    let matchingAgent = null;
    let agentAddress;

    try {
      // Call getUserSubscriptions function to get all user subscriptions
      const subscriptions = await publicClient.readContract({
        address: DELEGATE_CONTRACT_ADDRESS,
        abi: DeleGateABI.abi,
        functionName: 'getUserSubscriptions',
        args: [userAddress]
      }) as Array<{space: string, module: string}>;
      
      // Check if any subscription matches the current space
      const matchingSubscription = subscriptions.find(sub => sub.space === spaceId);
      
      if (matchingSubscription) {
        logger.info(`Found matching subscription for Space ${spaceId}: module=${matchingSubscription.module}`);
        
        
        // Call unsubscribe function on the contract
        const hash = await walletClient.writeContract({
          address: DELEGATE_CONTRACT_ADDRESS,
          abi: DeleGateABI.abi,
          functionName: 'unsubscribe',
          args: [spaceId, userAddress, matchingSubscription.module],
        });
        
        logger.info(`Unsubscribed agent from Space ${spaceId}, tx: ${hash}`);
        
        // Wait for transaction to be mined
        await publicClient.waitForTransactionReceipt({ hash });
        const agent = await getAgentByAddress(matchingSubscription.module)
        const success = agent ? await removeAgentFromSpace((agent._id as any).toString(), spaceId) : null;
      } else {
        logger.info(`No subscription found for user ${userAddress} in space ${spaceId}`);
      }
    } catch (error) {
      logger.warn(`Failed to check or unsubscribe agent: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    res.status(200).json({ message: 'Agent removed from space successfully' });
  } catch (error) {
    logger.error(`API error: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// predict-kms-address endpoint
app.post('/predict-agent-address', async (req, res) => {
  try {
    const { userAddress, spaceId } = req.body;
    
    // Validate that address is provided
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: userAddress'
      });
    }

    if (!spaceId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: spaceId'
      });
    }

    const existingAgent = await getAgentsByUserAddress(userAddress);

    if (existingAgent && existingAgent.length > 0) {
      // Filter agents to only those in the requested space
      const agentsInSpace = await Promise.all(
        existingAgent.map(async (agent) => {
          // Use proper type assertion to help TypeScript understand the document structure
          const agentDoc = agent as IAgent & { _id: { toString(): string } };
          const inSpace = await isAgentInSpace(agentDoc._id.toString(), spaceId);
          return inSpace ? agentDoc : null;
        })
      );

      // Get the first agent that's in the space
      const matchingAgent = agentsInSpace.filter(Boolean)[0];
      
      if (matchingAgent) {
        return res.status(200).json({
          success: true,
          predictedAgentAddress: matchingAgent.address,
          matchingSpace: true
        });
      }
      
      // If no agent matches the space, return the first agent with a flag
      return res.status(200).json({
        success: true,
        predictedAgentAddress: existingAgent[0].address,
        matchingSpace: false
      });
    }
    
    // Validate address format using Viem's Address type
    try {
      const predictedKMSAddress = await getKmsAddress(userAddress as Address);

      const { address: predictedAgentAddress } = getAgentAccountFromAddress(predictedKMSAddress);
      
      return res.status(200).json({
        success: true,
        predictedAgentAddress
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }
  } catch (error: any) {
    logger.error(`API error predicting KMS address: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Setup API endpoint
app.post('/agent', async (req, res) => {
  try {
    // Extract parameters from request body
    const { userAddress, spaceId } = req.body as { userAddress?: Address, spaceId?: string };
    
    // Validate input
    if (!userAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: userAddress' 
      });
    }

    if (!spaceId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: spaceId' 
      });
    }

    const subscriptions = await publicClient.readContract({
      address: DELEGATE_CONTRACT_ADDRESS,
      abi: DeleGateABI.abi,
      functionName: 'getUserSubscriptions',
      args: [userAddress]
    }) as Array<{space: string, module: string}>;

    const matchingSubscription = subscriptions.length > 0 ? subscriptions.find(sub => sub.space === spaceId) : null;   

    if (matchingSubscription) {
      logger.info(`Found matching subscription for Space ${spaceId}: module=${matchingSubscription.module}`);
      const agent = await getAgentByAddress(matchingSubscription.module);
      if (agent) {
        res.status(200).json({
          id: agent._id,
          address: agent.address,
          name: agent.name,
          kmsAdapterAddress: agent.kmsAdapterAddress,
          userAddress: agent.userAddress,
          existingAgent: true
        });
      }
      console.error(`Agent already exists for user ${userAddress} in space ${spaceId}, but not in DB`);
    }

    let kmsAddress = await publicClient.readContract({
      address: DELEGATE_CONTRACT_ADDRESS,
      abi: DeleGateABI.abi,
      functionName: 'getKmsAdapter',
      args: [userAddress],
    }) as Address;

    if (!kmsAddress) {
      kmsAddress = await deployKmsAdapter(
        KEYRING_GATEWAY_CONTRACT_ADDRESS, 
        DELEGATE_CONTRACT_ADDRESS
      );

      logger.info(`Successfully deployed KMS Adapter: ${kmsAddress}`);

      const setKmsHash = await walletClient.writeContract({
        address: DELEGATE_CONTRACT_ADDRESS,
        abi: DeleGateABI.abi,
        functionName: 'setKmsAdapter',
        args: [kmsAddress, userAddress],
      });

      const setKmsReceipt = await publicClient.waitForTransactionReceipt({ hash: setKmsHash });
      
      if (setKmsReceipt.status !== 'success') {
        throw new KmsDeployError(setKmsHash, setKmsReceipt.status);
      }

      logger.info(`Successfully set KMS Adapter: ${setKmsReceipt.transactionHash} for voter ${userAddress}`);
    }

    const agentAccount = getAgentAccountFromAddress(kmsAddress);

    const hdKey = agentAccount.getHdKey();
    const privateKeyBytes = hdKey.privateKey;
    if (!privateKeyBytes) {
      throw new Error('Failed to retrieve private key bytes');
    }
    const AgentPrivateKey = `0x${Buffer.from(privateKeyBytes).toString('hex')}`;

    const agent = await addAgent(
      agentAccount.address,
      AgentPrivateKey,
      agentAccount.address,
      kmsAddress,  // KMS adapter address
      userAddress  // User address
    );

    if (!agent) {
      return res.status(500).json({ error: 'Failed to create agent' });
    }

    // Trigger proposal fetching and scheduling for the new agent
    console.log('Fetching and scheduling proposals for the new agent');
    runFetchAndSchedule().catch(err => {
      logger.error(`Failed to run scheduler after adding agent: ${err.message}`);
    });

    return res.status(201).json({
      id: agent._id,
      address: agent.address,
      name: agent.name,
      kmsAdapterAddress: agent.kmsAdapterAddress,
      userAddress: agent.userAddress,
      existingAgent: false
    });
  } catch (error: unknown) {
    if (error instanceof KmsDeployError) {
      logger.error(`KMS deployment failed: ${error.message}, Hash: ${error.transactionHash}, Status: ${error.status}`);
      return res.status(500).json({
        success: false,
        error: error.message,
        transactionHash: error.transactionHash,
        status: error.status
      });
    }
    
    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error adding Agent: ${errorMessage}`);
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

// Get all scheduled votes with filtering options
app.get('/api/votes', async (req, res) => {
  try {
    const {
      status,
      spaceId,
      agentId,
      limit = 100,
      skip = 0,
      sortBy = 'scheduledTime',
      sortDirection = 'asc'
    } = req.query;
    
    const votes = await getScheduledVotes({
      status: status as any,
      spaceId: spaceId as string,
      agentId: agentId as string,
      limit: parseInt(limit as string || '100', 10),
      skip: parseInt(skip as string || '0', 10),
      sortBy: sortBy as string,
      sortDirection: (sortDirection as 'asc' | 'desc') || 'asc'
    });
    
    res.json(votes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve scheduled votes' });
  }
});

app.get('/api/votes-simple', async (req, res) => {
  try {
    const {
      status,
      spaceId,
      agentId,
      limit = 100,
      skip = 0,
      sortBy = 'scheduledTime',
      sortDirection = 'asc'
    } = req.query;
    
    const votes = await getScheduledVotes({
      status: status as any,
      spaceId: spaceId as string,
      agentId: agentId as string,
      limit: parseInt(limit as string || '100', 10),
      skip: parseInt(skip as string || '0', 10),
      sortBy: sortBy as string,
      sortDirection: (sortDirection as 'asc' | 'desc') || 'asc'
    });
    
    // Return simplified vote objects with just the requested fields
    const simplifiedVotes = votes.map(vote => {
      // Get the agent info properly typed
      const agent = vote.agentId as unknown as IAgent;
      
      return {
        voteId: vote._id,
        proposalId: vote.proposalId,
        agentAddress: agent.address,
        userAddress: agent.userAddress || null, // Add the userAddress
        scheduledTime: vote.scheduledTime
      };
    });
    
    res.json(simplifiedVotes);
  } catch (error) {
    logger.error(`API error retrieving simplified votes: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Failed to retrieve simplified votes' });
  }
});

// Get vote by ID
app.get('/api/votes/:id', async (req, res) => {
  try {
    const vote = await getScheduledVoteById(req.params.id);
    
    if (!vote) {
      return res.status(404).json({ error: 'Vote not found' });
    }
    
    res.json(vote);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve scheduled vote' });
  }
});

// Execute a specific vote now (override schedule)
app.post('/api/votes/:id/execute', async (req, res) => {
  try {
    const voteId = req.params.id;
    
    // Get the scheduled vote
    const vote = await getScheduledVoteById(voteId);
    
    if (!vote) {
      return res.status(404).json({ error: 'Vote not found' });
    }
    
    // Check if vote is already completed or failed
    if (vote.status !== 'scheduled') {
      return res.status(400).json({ 
        error: 'Vote cannot be executed', 
        status: vote.status,
        message: `This vote has already been ${vote.status}`
      });
    }
    
    // Get agent information
    const agent = vote.agentId as unknown as IAgent;
    
    logger.info(`Manually executing vote for proposal: ${vote.proposalTitle} (${vote.proposalId}) for agent ${agent.name}`);
    
    // Create a simplified proposal object with the necessary information
    const proposal = {
      id: vote.proposalId,
      title: vote.proposalTitle,
      space: {
        id: vote.spaceId,
        name: vote.spaceId
      }
    } as SnapshotProposal;
    
    // Execute the vote
    await castVote(proposal, agent.address, agent.privateKey, vote.defaultVote);
    await markVoteCompleted((vote._id as any).toString());
    
    logger.info(`Manually triggered vote for proposal ${vote.proposalId} successfully executed`);
    
    res.status(200).json({ 
      success: true, 
      message: `Vote for proposal ${vote.proposalId} executed successfully` 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to execute vote: ${errorMessage}`);
    res.status(500).json({ error: 'Failed to execute vote', message: errorMessage });
  }
});

// Get vote statistics
app.get('/api/votes/statistics', async (req, res) => {
  try {
    const stats = await getVoteStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve vote statistics' });
  }
});

// Get upcoming votes
app.get('/api/votes/upcoming', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string || '24', 10);
    const votes = await getUpcomingVotes(hours);
    res.json(votes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve upcoming votes' });
  }
});

// Start the server
export function startApiServer(port: number = 3000): void {
  app.listen(port, () => {
    logger.info(`API server listening on port ${port}`);
  });
}