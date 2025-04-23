import mongoose, { Schema, Document } from 'mongoose';

export interface IAgent extends Document {
  address: string;
  privateKey: string;
  name: string;
  active: boolean;
  kmsAdapterAddress?: string;
  userAddress?: string;  // Add user/voter address
  createdAt: Date;
  updatedAt: Date;
}

export interface IAgentSpace extends Document {
  agentId: mongoose.Types.ObjectId;
  spaceId: string; // The space/DAO ID (e.g., "uniswap.eth")
  defaultVote: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IScheduledVote extends Document {
  proposalId: string;
  proposalTitle: string;
  spaceId: string;
  agentId: mongoose.Types.ObjectId;
  scheduledTime: Date;
  status: 'scheduled' | 'completed' | 'failed';
  executedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AgentSchema = new Schema<IAgent>(
  {
    address: { type: String, required: true, unique: true },
    privateKey: { type: String, required: true },
    name: { type: String, required: true },
    active: { type: Boolean, default: true },
    kmsAdapterAddress: { type: String },
    userAddress: { type: String }  // Add user/voter address
  },
  { timestamps: true }
);

const AgentSpaceSchema = new Schema<IAgentSpace>(
  {
    agentId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Agent',
      required: true 
    },
    spaceId: { type: String, required: true },
    defaultVote: { type: Number, default: 1 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Create a compound index to ensure uniqueness of agent-space combinations
AgentSpaceSchema.index({ agentId: 1, spaceId: 1 }, { unique: true });

const ScheduledVoteSchema = new Schema<IScheduledVote>(
  {
    proposalId: { type: String, required: true },
    proposalTitle: { type: String, required: true },
    spaceId: { type: String, required: true },
    agentId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Agent',
      required: true 
    },
    scheduledTime: { type: Date, required: true, index: true },
    status: { 
      type: String, 
      required: true, 
      enum: ['scheduled', 'completed', 'failed'],
      default: 'scheduled'
    },
    executedAt: { type: Date },
    error: { type: String }
  },
  { timestamps: true }
);

// Create a compound index for faster querying
ScheduledVoteSchema.index({ status: 1, scheduledTime: 1 });

export const Agent = mongoose.model<IAgent>('Agent', AgentSchema);
export const AgentSpace = mongoose.model<IAgentSpace>('AgentSpace', AgentSpaceSchema);
export const ScheduledVote = mongoose.model<IScheduledVote>('ScheduledVote', ScheduledVoteSchema);