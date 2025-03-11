import { arbitrum, monadTestnet, zksync } from "viem/chains";
import * as chains from "viem/chains"

export default {
    daos: [
        {
            name: "Arbitrum",
            address: "0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9",
            chainId: arbitrum.id,
            link: "https://www.tally.xyz/gov/arbtrum"
        },
        {
            name: "ZKsync",
            address: "0x76705327e682F2d96943280D99464Ab61219e34f",
            chainId: zksync.id,
            link: "https://www.tally.xyz/gov/zksync"
        }
    ],
    contractAddresses: {
        [monadTestnet.id]: {
            keyringGateway: "0xa06A56B4E1E951B035567bc064C42A9eE2b9BDd2",
            deleGate: "0xB391a98fa115bB7ae84FbD7fc25Cf54A493F9EaA",
        },
        [arbitrum.id]: {
            keyringGateway: "0x8b44EC369BAbF9b55c90446623e68E83959397f8"
        }
    },
    chains: Object.values(chains).reduce((acc, chain) => {
        acc[chain.id] = chain
        return acc
    }, {})
}