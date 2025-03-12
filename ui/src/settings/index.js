import * as chains from "viem/chains"

export default {
    data: [
        {
          address: "0x1eAB2d7c886890A60c03aBf9954e5586F22A19d8",
          nSubscriptions: 1,
          nVotes: 2,
          votes: [
            {
                proposalId: 417,
                title: "[Gauntlet] - Rewards Top Up for Ethereum, Base and Optimism (10/3/25)",
                address: "0x309a862bbC1A00e45506cB8A802D1ff10004c8C0",
                transactionHashUrl: "",
                status: "Waiting",
                url: "https://www.tally.xyz/gov/compound/proposal/417",
                choice: "For",
                daoUrl: "https://www.tally.xyz/gov/compound"
            },
            {
                title: "2025 Compound Growth Program - Roadmap & Renewal - [AlphaGrowth] V3",
                proposalId: 416, 
                address: "0x309a862bbC1A00e45506cB8A802D1ff10004c8C0",
                transactionHashUrl: "",
                status: "Casted by User",
                url: "https://www.tally.xyz/gov/compound/proposal/416",
                choice: "For",
                daoUrl: "https://www.tally.xyz/gov/compound"
            },
            {
                title: "Add weETH as collateral into cUSDTv3 on Mainnet",
                proposalId: 415, 
                address: "0x309a862bbC1A00e45506cB8A802D1ff10004c8C0",
                transactionHashUrl: "",
                status: "Casted by DeleGate",
                url: "https://www.tally.xyz/gov/compound/proposal/415",
                choice: "Against",
                daoUrl: "https://www.tally.xyz/gov/compound"
            },
            {
                title: "Initialize cWETHv3 on Ronin",
                proposalId: 414, 
                address: "0x309a862bbC1A00e45506cB8A802D1ff10004c8C0",
                transactionHashUrl: "",
                status: "Not Casted",
                url: "https://www.tally.xyz/gov/compound/proposal/414",
                choice: "-",
                daoUrl: "https://www.tally.xyz/gov/compound"
            },
        ]
        },
        {
          address: "0xE6C2542904a67E1c87b1f76A8AbC949213b54414",
          nSubscriptions: 2,
          nVotes: 2,
          votes: [
            {
                title: "[NON-CONSTITUTIONAL] Arbitrum Onboarding V2: A Governance Bootcamp",
                proposalId: "41764616447638715300612914863093416410063619332654034338488569044333128121381", 
                address: "0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9",
                transactionHashUrl: "",
                status: "Waiting",
                url: "https://www.tally.xyz/gov/arbitrum/proposal/41764616447638715300612914863093416410063619332654034338488569044333128121381",
                choice: "-",
                daoUrl: "https://www.tally.xyz/arbitrum/compound"
            },
            {
                title: "Request to Increase the Stylus Sprint Committee’s Budget",
                proposalId: "27831845498978337986467036886891836384283300266814708262424272663046958396151", 
                address: "0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9",
                transactionHashUrl: "https://arbiscan.io/tx/0x3e5a097a024b6bb152df77ddf842737aff98d9ba4fb3c0f84ca28d9b80ab7f32",
                status: "Casted by DeleGate",
                url: "https://www.tally.xyz/gov/arbitrum/proposal/27831845498978337986467036886891836384283300266814708262424272663046958396151",
                choice: "For",
                daoUrl: "https://www.tally.xyz/arbitrum/compound"
            },
            {
                title: "Arbitrum D.A.O. (Domain Allocator Offerings) Grant Program - Season 3",
                proposalId: "47215139570733026393508270943324710379923699871435188004224569883226292800465", 
                address: "0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9",
                transactionHashUrl: "",
                status: "Casted by DeleGate",
                url: "https://www.tally.xyz/gov/arbitrum/proposal/47215139570733026393508270943324710379923699871435188004224569883226292800465",
                choice: "For",
                daoUrl: "https://www.tally.xyz/arbitrum/compound"
            },
            {
                title: "Non-Constitutional: Stable Treasury Endowment Program 2.0",
                proposalId: "13323456481927947871314500108227684550647495448005726995657704713229313956489", 
                address: "0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9",
                transactionHashUrl: "",
                status: "Casted by User",
                url: "https://www.tally.xyz/gov/arbitrum/proposal/13323456481927947871314500108227684550647495448005726995657704713229313956489",
                choice: "For",
                daoUrl: "https://www.tally.xyz/arbitrum/compound"
            },
            {
                title: "OpCo: A DAO-adjacent Entity for Strategy Execution",
                proposalId: "41351298371775353090222506531903916823291804644712693824312064183457809617851", 
                address: "0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9",
                transactionHashUrl: "",
                status: "Casted by User",
                url: "https://www.tally.xyz/gov/arbitrum/proposal/41351298371775353090222506531903916823291804644712693824312064183457809617851",
                choice: "For",
                daoUrl: "https://www.tally.xyz/arbitrum/compound"
            },
            
          ]
        },
    ],
    daos: [
        {
            name: "Arbitrum",
            address: "0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9",
            chainId: chains.arbitrum.id,
            link: "https://www.tally.xyz/gov/arbitrum",
            explorer: "https://arbiscan.io/"
        },
        {
            name: "Compound",
            address: "0x309a862bbC1A00e45506cB8A802D1ff10004c8C0",
            chainId: chains.mainnet.id,
            link: "https://www.tally.xyz/gov/compound",
            explorer: "https://etherscan.io/"
        },
        {
            name: "ZKsync",
            address: "0x76705327e682F2d96943280D99464Ab61219e34f",
            chainId: chains.zksync.id,
            link: "https://www.tally.xyz/gov/zksync",
            explorer: "https://explorer.zksync.io/"
        },
        {
            name: "GMX",
            address: "0x4bd1cdAab4254fC43ef6424653cA2375b4C94C0E",
            chainId: chains.arbitrum.id,
            link: "https://www.tally.xyz/gov/gmx",
            explorer: "https://arbiscan.io/"
        },
        {
            name: "OnChainAustria",
            address: "0xc93DE629BF8f4Aa7051589F37d2AffdfCCe940cA",
            chainId: chains.arbitrum.id,
            link: "https://www.tally.xyz/gov/onchainaustria-dao",
            explorer: "https://arbiscan.io/"
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