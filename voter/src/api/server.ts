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
  getAgentById
} from '../db/service';
import logger from '../logger';
import { deployKmsAdapter, getAgentAccountFromAddress, getAgentsByUserAddress, getKmsAddress, publicClient, walletClient } from '../lib/utils';
import { Address } from 'viem';
import DeleGateABI from '../artifacts/DeleGate.json';
import { DELEGATE_CONTRACT_ADDRESS, KEYRING_GATEWAY_CONTRACT_ADDRESS } from '../config';
import { IAgent } from '../db/models';


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

// Add a new agent
// app.post('/agents', async (req, res) => {
//   try {
//     const { address, privateKey, name } = req.body;
    
//     if (!address || !privateKey || !name) {
//       return res.status(400).json({ error: 'Missing required fields' });
//     }
    
//     const agent = await addAgent(address, privateKey, name);
    
//     if (!agent) {
//       return res.status(500).json({ error: 'Failed to create agent' });
//     }
    
//     res.status(201).json({
//       id: agent._id,
//       address: agent.address,
//       name: agent.name
//     });
//   } catch (error) {
//     logger.error(`API error: ${error instanceof Error ? error.message : String(error)}`);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

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
    const { agentId, existing } = req.body;
    
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
          args: [spaceId, agent.address],
        });
        
        logger.info(`Subscribed agent ${agent.address} to Space ${spaceId}, tx: ${hash}`);
        
        // Wait for transaction to be mined
        await publicClient.waitForTransactionReceipt({ hash });
      } catch (error) {
        logger.error(`Failed to subscribe agent: ${error instanceof Error ? error.message : String(error)}`);
        // Return the agent info anyway, even if subscription failed
        return res.status(200).json({
          id: agentId,
          address: agent.address,
          subscriptionError: error instanceof Error ? error.message : String(error)
        });
      }
    }
    const success = await addAgentToSpace(agentId, spaceId, 1);
    
    if (!success) {
      return res.status(400).json({ error: 'Failed to add agent to space' });
    }
    
    res.status(201).json({ message: 'Agent added to space successfully', subscribeTx: hash });
  } catch (error) {
    logger.error(`API error: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove an agent from a space
app.delete('/spaces/:spaceId/users/:userAddress', async (req, res) => {
  try {
    const { spaceId, userAddress } = req.params;

    const agents = await getAgentsByUserAddress(userAddress);
    if (!agents || agents.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agentsInSpace = await Promise.all(
      agents.map(async (agent) => {
        // Use proper type assertion to help TypeScript understand the document structure
        const agentDoc = agent as IAgent & { _id: { toString(): string } };
        const inSpace = await isAgentInSpace(agentDoc._id.toString(), spaceId);
        return inSpace ? agentDoc : null;
      })
    );

    const agentId = agentsInSpace[0]?._id.toString();
    if (!agentId) {
      return res.status(404).json({ error: 'Agent not found in this space' });
    }

    const success = await removeAgentFromSpace(agentId, spaceId);
    
    if (!success) {
      return res.status(404).json({ error: 'Agent or space not found' });
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
    const { userAddress, spaceId } = req.body as { userAddress?: string, spaceId?: string };
    
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

    const alreadyExistingAgents = await getAgentsByUserAddress(userAddress);

    // If an agent already exists for this user, return the existing agent info
    if (alreadyExistingAgents && alreadyExistingAgents.length > 0) {
      const existingAgent = alreadyExistingAgents[0];
      logger.info(`Found existing agent for user ${userAddress}: ${existingAgent.address}`);
        
      return res.status(200).json({
        id: existingAgent._id,
        address: existingAgent.address,
        name: existingAgent.name,
        kmsAdapterAddress: existingAgent.kmsAdapterAddress,
        userAddress: existingAgent.userAddress,
        existingAgent: true
      });
    }

    // If no agent exists, continue with the existing flow to create a new one
    try {
      const validatedVoterAddress = userAddress as Address;
      
      const kmsAdapterAddress = await deployKmsAdapter(
        KEYRING_GATEWAY_CONTRACT_ADDRESS, 
        DELEGATE_CONTRACT_ADDRESS
      );
      
      logger.info(`Successfully deployed KMS Adapter: ${kmsAdapterAddress}`);
      logger.info(`Setting KMS adapter ${kmsAdapterAddress} for voter ${validatedVoterAddress}`);
      
      // Call setKmsAdapter function on the contract
      const hash = await walletClient.writeContract({
        address: DELEGATE_CONTRACT_ADDRESS,
        abi: DeleGateABI.abi,
        functionName: 'setKmsAdapter',
        args: [kmsAdapterAddress, validatedVoterAddress],
      });
      
      // Wait for transaction to be mined
      await publicClient.waitForTransactionReceipt({ hash });

      const agentAccount = getAgentAccountFromAddress(kmsAdapterAddress);

      const hdKey = agentAccount.getHdKey();
      const privateKeyBytes = hdKey.privateKey;
      if (!privateKeyBytes) {
        throw new Error('Failed to retrieve private key bytes');
      }
      const AgentPrivateKey = `0x${Buffer.from(privateKeyBytes).toString('hex')}`;

      // Pass both kmsAdapterAddress and validatedVoterAddress to addAgent
      const agent = await addAgent(
        agentAccount.address,
        AgentPrivateKey,
        agentAccount.address,
        kmsAdapterAddress,   // KMS adapter address
        validatedVoterAddress  // User/voter address
      );

      if (!agent) {
        return res.status(500).json({ error: 'Failed to create agent' });
      }
      
      res.status(201).json({
        id: agent._id,
        address: agent.address,
        name: agent.name,
        kmsAdapterAddress: agent.kmsAdapterAddress,
        userAddress: agent.userAddress,
        existingAgent: false
      });        
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error adding Agent: ${errorMessage}`);
    return res.status(500).json({
        success: false,
        error: errorMessage
    });
  }
});

// Start the server
export function startApiServer(port: number = 3000): void {
  app.listen(port, () => {
    logger.info(`API server listening on port ${port}`);
  });
}