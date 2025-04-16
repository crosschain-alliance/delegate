import mongoose from 'mongoose';
import { Agent, AgentSpace, IAgent, IAgentSpace } from './models';
import logger from '../logger';

/**
 * Initialize the database connection
 */
export async function initializeDatabase(connectionString: string): Promise<void> {
  try {
    await mongoose.connect(connectionString);
    logger.info('Database connection established');
  } catch (error) {
    logger.error(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Get all active agents for a specific space
 */
export async function getAgentsForSpace(spaceId: string): Promise<Array<{agent: IAgent, defaultVote: number}>> {
  try {
    const agentSpaces = await AgentSpace.find({ 
      spaceId, 
      active: true 
    }).populate('agentId');
    
    return agentSpaces.map(as => ({
      agent: as.agentId as unknown as IAgent,
      defaultVote: as.defaultVote
    }));
  } catch (error) {
    logger.error(`Failed to get agents for space ${spaceId}: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Get all spaces (DAOs) with active agents
 */
export async function getAllActiveSpaces(): Promise<string[]> {
  try {
    const result = await AgentSpace.distinct('spaceId', { active: true });
    return result;
  } catch (error) {
    logger.error(`Failed to get active spaces: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Add an agent to a space
 */
export async function addAgentToSpace(
  agentId: string, 
  spaceId: string, 
  defaultVote: number = 1
): Promise<boolean> {
  try {
    const agent = await Agent.findById(agentId);
    if (!agent) {
      logger.error(`Agent ${agentId} not found`);
      return false;
    }

    await AgentSpace.findOneAndUpdate(
      { agentId, spaceId },
      { agentId, spaceId, defaultVote, active: true },
      { upsert: true, new: true }
    );
    
    logger.info(`Agent ${agent.name} (${agent.address}) added to space ${spaceId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to add agent to space: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Remove an agent from a space
 */
export async function removeAgentFromSpace(agentId: string, spaceId: string): Promise<boolean> {
  try {
    const result = await AgentSpace.findOneAndUpdate(
      { agentId, spaceId },
      { active: false }
    );
    
    if (!result) {
      logger.warn(`Agent ${agentId} was not assigned to space ${spaceId}`);
      return false;
    }
    
    logger.info(`Agent ${agentId} removed from space ${spaceId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to remove agent from space: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Add a new agent
 */
export async function addAgent(
  address: string,
  privateKey: string,
  name: string,
  kmsAdapterAddress?: string,
  userAddress?: string
): Promise<IAgent | null> {
  try {
    const agent = new Agent({ 
      address, 
      privateKey, 
      name,
      kmsAdapterAddress,
      userAddress,
      active: true 
    });
    await agent.save();
    logger.info(`New agent added: ${name} (${address}) with KMS adapter: ${kmsAdapterAddress || 'not provided'} for user: ${userAddress || 'not provided'}`);
    return agent;
  } catch (error) {
    logger.error(`Failed to add agent: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Get all active agents
 */
export async function getAllAgents(): Promise<IAgent[]> {
  try {
    return await Agent.find({ active: true });
  } catch (error) {
    logger.error(`Failed to get agents: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Get agent address from agent ID
 * @param agentId The MongoDB ID of the agent
 * @returns The agent document or null if not found
 */
export async function getAgentById(agentId: string): Promise<IAgent | null> {
  try {
    const agent = await Agent.findById(agentId);
    if (!agent) {
      logger.warn(`Agent with ID ${agentId} not found`);
      return null;
    }
    return agent;
  } catch (error) {
    logger.error(`Failed to get agent address by ID: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Get agent by its Ethereum address
 * @param address The Ethereum address of the agent
 * @returns The agent document or null if not found
 */
export async function getAgentByAddress(address: string): Promise<IAgent | null> {
    try {
        const agent = await Agent.findOne({ address, active: true });
        if (!agent) {
            logger.warn(`Agent with address ${address} not found or not active`);
            return null;
        }
        return agent;
    } catch (error) {
        logger.error(`Failed to get agent by address: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Get agents by user address
 * @param userAddress The Ethereum address of the user who owns the agent
 * @returns Array of agent documents or empty array if none found
 */
export async function getAgentsByUserAddress(userAddress: string): Promise<IAgent[]> {
  try {
    const agents = await Agent.find({ userAddress, active: true });
    if (agents.length === 0) {
      logger.info(`No active agents found for user address ${userAddress}`);
      return [];
    }
    logger.info(`Found ${agents.length} active agent(s) for user address ${userAddress}`);
    return agents;
  } catch (error) {
    logger.error(`Failed to get agents by user address: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Check if an agent is associated with a specific space
 * @param agentId The ID of the agent
 * @param spaceId The ID of the space
 * @returns True if the agent is associated with the space, false otherwise
 */
export async function isAgentInSpace(agentId: string, spaceId: string): Promise<boolean> {
  try {
    const agentSpace = await AgentSpace.findOne({ 
      agentId, 
      spaceId, 
      active: true 
    });
    
    return !!agentSpace;
  } catch (error) {
    logger.error(`Failed to check if agent is in space: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Safely extract the string ID from a MongoDB document
 */
export function getDocumentId(doc: any): string {
  if (!doc) return '';
  if (typeof doc._id === 'string') return doc._id;
  if (doc._id && typeof doc._id.toString === 'function') return doc._id.toString();
  return '';
}