export interface SnapshotProposal {
    id: string;
    title: string;
    body: string;
    choices: string[];
    start: number;
    end: number;
    snapshot: string;
    state: string;
    author: string;
    space: {
      id: string;
      name: string;
    };
  }
  
  export interface VoteParams {
    space: string;
    proposal: string;
    type: string;
    choice: number;
  }
  
  export interface DAOConfig {
    id: string;
    name: string;
    defaultVote: number; // Default voting choice (1-based index)
    strategy?: string; // Optional voting strategy
  }