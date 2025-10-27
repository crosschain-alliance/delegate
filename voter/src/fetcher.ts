import axios from 'axios';
import { SNAPSHOT_HUB_URL, TALLY_API_URL, TALLY_API_KEY } from './config';
import { SnapshotProposal, TallyProposal } from './types';
import logger from './logger';

/**
 * Fetches active proposals from a given space (DAO)
 */
export async function fetchProposals(spaceId: string): Promise<SnapshotProposal[]> {
  try {
    // Current time in seconds
    const currentTimeSeconds = Math.floor(Date.now() / 1000);
    
    // Ensure we're using the /graphql endpoint
    const graphqlUrl = SNAPSHOT_HUB_URL.endsWith('/graphql') 
      ? SNAPSHOT_HUB_URL 
      : `${SNAPSHOT_HUB_URL}/graphql`;
    
    const query = `
      query {
        proposals(
          first: 100,
          skip: 0,
          where: {
            space_in: ["${spaceId}"],
            state: "active"
          },
          orderBy: "created",
          orderDirection: desc
        ) {
          id
          title
          body
          choices
          start
          end
          snapshot
          state
          author
          space {
            id
            name
          }
        }
      }
    `;

    logger.info(`Fetching proposals for DAO: ${spaceId}`);
    logger.info(`Using GraphQL endpoint: ${graphqlUrl}`);
    
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
    }
    
    if (!data.data || !data.data.proposals) {
      logger.warn(`Unexpected API response structure: ${JSON.stringify(data)}`);
      return [];
    }
    
    const proposals = data.data.proposals;
    
    // Debug log the entire response
    // logger.info(`API Response: ${JSON.stringify(data, null, 2)}`);
    
    // Log all proposals found before filtering
    logger.info(`Found ${proposals.length} proposals for ${spaceId} before filtering:`);
    proposals.forEach((p: SnapshotProposal) => {
      const endDate = new Date(p.end * 1000).toISOString();
      logger.info(`- ID: ${p.id}, Title: ${p.title}, End time: ${endDate}, Space: ${p.space.id}`);
    });
    
    return proposals;
  } catch (error) {
    logger.error(`Failed to fetch proposals for ${spaceId}: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Fetches active proposals from a Tally Governor contract
 */
export async function fetchTallyProposals(governorAddress: string): Promise<TallyProposal[]> {
  try {
    if (!TALLY_API_URL) {
      logger.warn('TALLY_API_URL not configured, skipping Tally proposal fetch');
      return [];
    }

    const query = `
      query {
        governor(input: {id: "eip155:42161:${governorAddress}"}) {
          id
          name
          organization {
            id
            name
          }
          proposalStats {
            total
            active
          }
        }
      }
    `;

    logger.info(`Fetching Tally proposals for Governor: ${governorAddress}`);
    logger.info(`Using Tally API endpoint: ${TALLY_API_URL}`);

    const response = await fetch(TALLY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(TALLY_API_KEY ? { 'Api-Key': TALLY_API_KEY } : {}),
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
    }

    if (!data.data || !data.data.governor) {
      logger.warn(`No governor found for address: ${governorAddress}`);
      return [];
    }

    const governor = data.data.governor;
    if (!data.data || !data.data.governor) {
      logger.warn(`No governor found for address ${governorAddress}`);
      return [];
    }

    logger.info(`Found governor: ${data.data.governor.name}`);
    return [];
  } catch (error) {
    logger.error(`Failed to fetch Tally proposals for ${governorAddress}: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Filters proposals that will end within the next 24 hours from now
 */
// export function filterProposalsEndingWithin24Hours(
//   proposals: SnapshotProposal[]
// ): SnapshotProposal[] {
//   // Current time in seconds
//   const currentTimeSeconds = Math.floor(Date.now() / 1000);
  
//   // 24 hours from now in seconds (24 * 60 * 60 = 86400 seconds)
//   const twentyFourHoursLaterSeconds = currentTimeSeconds + 86400;
  
//   // Log filtering parameters
//   logger.info(`Filtering proposals ending within 24 hours: current time=${new Date(currentTimeSeconds * 1000).toISOString()}, 24h later=${new Date(twentyFourHoursLaterSeconds * 1000).toISOString()}`);
  
//   const filteredProposals = proposals.filter(proposal => 
//     proposal.end >= currentTimeSeconds && // Not yet ended
//     proposal.end <= twentyFourHoursLaterSeconds // Will end within 24 hours
//   );
  
//   // Log filtered proposals
//   logger.info(`After filtering, ${filteredProposals.length} proposals will end within the next 24 hours`);
//   filteredProposals.forEach((p: SnapshotProposal) => {
//     const endDate = new Date(p.end * 1000).toISOString();
//     const hoursUntilEnd = Math.round((p.end - currentTimeSeconds) / 3600 * 10) / 10;
//     logger.info(`- SELECTED: ID: ${p.id}, Title: ${p.title}, End time: ${endDate} (in ${hoursUntilEnd} hours), Space: ${p.space.id}`);
//   });
  
//   return filteredProposals;
// }