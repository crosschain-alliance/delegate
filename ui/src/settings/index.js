import * as chains from "viem/chains"

export default {
    data: [
        {
          address: "0x1eAB2d7c886890A60c03aBf9954e5586F22A19d8",
          nSubscriptions: 2,
          nVotes: 3,
          votes: [{proposalId: 417, address: "0x309a862bbC1A00e45506cB8A802D1ff10004c8C0"}]
        },
        {
          address: "0xE6C2542904a67E1c87b1f76A8AbC949213b54414",
          nSubscriptions: 2,
          nVotes: 8,
          votes: [
            {
                proposalId: "90008155879610681976211370898664529133451761866126020049163893113671401566233", 
                address: "0xc93DE629BF8f4Aa7051589F37d2AffdfCCe940cA"},
            {
                proposalId: "14881197137069494959448952699217598923721993392617887469969318742509097999570",
                address: "0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9"
            }
          ]
        },
      ],
    daos: [
        {
            name: "Arbitrum",
            address: "0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9",
            chainId: chains.arbitrum.id,
            link: "https://www.tally.xyz/gov/arbitrum"
        },
        {
            name: "Compound",
            address: "0x309a862bbC1A00e45506cB8A802D1ff10004c8C0",
            chainId: chains.mainnet.id,
            link: "https://www.tally.xyz/gov/compound"
        },
        {
            name: "ZKsync",
            address: "0x76705327e682F2d96943280D99464Ab61219e34f",
            chainId: chains.zksync.id,
            link: "https://www.tally.xyz/gov/zksync"
        },
        {
            name: "GMX",
            address: "0x4bd1cdAab4254fC43ef6424653cA2375b4C94C0E",
            chainId: chains.arbitrum.id,
            link: "https://www.tally.xyz/gov/gmx"
        },
        {   
            name: "OnChainAustria",
            address: "0xc93DE629BF8f4Aa7051589F37d2AffdfCCe940cA",
            chainId: chains.arbitrum.id,
            link: "https://www.tally.xyz/gov/onchainaustria-dao"
        }
    ],
    contractAddresses: {
        [chains.monadTestnet.id]: {
            keyringGateway: "0xa06A56B4E1E951B035567bc064C42A9eE2b9BDd2",
            deleGate: "0xec5eF31A773b3F135A093dd1A6e9B9C06e433710",
        },
        [chains.arbitrum.id]: {
            keyringGateway: "0x8b44EC369BAbF9b55c90446623e68E83959397f8"
        },
        [chains.mainnet.id]: {
            keyringGateway: "0xce5dF6D41e7cC4780E75b001BC64588440b3450b"
        }
    },
    deployBlockNumbers: {
        [chains.monadTestnet.id]: {
            deleGate: 7273976,
        },
    },
    chains: Object.values(chains).reduce((acc, chain) => {
        acc[chain.id] = chain
        return acc
    }, {})
}