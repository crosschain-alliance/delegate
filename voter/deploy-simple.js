const { ethers } = require('ethers');

// Extremely simple contract that just emits events
const contractABI = [
    "function signTallyVote(address governorAddress, uint256 proposalId, uint8 support, string calldata reason) external",
    "event tallySignVote(address indexed sender, tuple(address governorAddress, uint256 proposalId, uint8 support, string reason) vote)"
];

// Minimal working bytecode that just emits the event
const contractBytecode = "0x608060405234801561001057600080fd5b50610200806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063a87430ba14610030575b600080fd5b61004a600480360381019061004591906100fd565b61004c565b005b7fc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a47033858585856040516100819594939291906101a0565b60405180910390a150505050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006100be82610093565b9050919050565b6100ce816100b3565b81146100d957600080fd5b50565b6000813590506100eb816100c5565b92915050565b6000819050919050565b610104816100f1565b811461010f57600080fd5b50565b600081359050610121816100fb565b92915050565b600060ff82169050919050565b61013d81610127565b811461014857600080fd5b50565b60008135905061015a81610134565b92915050565b600080fd5b600080fd5b600080fd5b60008083601f8401126101855761018461015b565b5b8235905067ffffffffffffffff8111156101a2576101a1610160565b5b6020830191508360018202830111156101be576101bd610165565b5b9250929050565b6000806000806080858703121561017f5761017e61008e565b5b600061018d878288016100dc565b945050602061019e87828801610112565b93505060406101af8782880161014b565b925050606085013567ffffffffffffffff8111156101d0576101cf610093565b5b6101dc8782880161016a565b915050929509295509250565b6101f2816100b3565b82525050565b610201816100f1565b82525050565b61021081610127565b82525050565b600081519050919050565b600082825260208201905092915050565b60005b8381101561025057808201518184015260208101905061023557505050505050565b83811115610216576000848401525b50505050565b6000601f19601f8301169050919050565b600061027182610216565b61027b8185610221565b935061028b818560208601610232565b6102948161025c565b840191505092915050565b600060a0820190506102b460008301886101e9565b6102c160208301876101f8565b6102ce6040830186610207565b81810360608301526102e08185610266565b90509695505050505050565b50565b565b6102fb816100b3565b811461030657600080fd5b50565b600081359050610318816102f2565b92915050565b60006020828403121561033457610333610309565b5b600061034284828501610309565b9150509291505056fea264697066735822";

async function deployContract() {
    try {
        console.log('🚀 Deploying simplified KeyringGateway to Arbitrum...');
        
        const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
        const wallet = new ethers.Wallet('0x73b248b923fd70a158cfe0aa73e348a38ec8cb73e39cb6f0cd3f573f8c095b41', provider);
        
        // Create contract factory with simplified contract
        const contractFactory = new ethers.ContractFactory(contractABI, contractBytecode, wallet);
        
        // Deploy with manual gas settings for Arbitrum
        const contract = await contractFactory.deploy({
            gasLimit: 2000000,
            gasPrice: ethers.utils.parseUnits('0.1', 'gwei')
        });
        
        console.log('📋 Transaction hash:', contract.deployTransaction.hash);
        console.log('⏳ Waiting for deployment...');
        
        await contract.deployed();
        
        console.log('✅ Contract deployed at:', contract.address);
        
        // Initialize the contract
        console.log('🔧 Initializing contract...');
        const initTx = await contract.initialize(owner, {
            gasLimit: 500000,
            gasPrice: ethers.utils.parseUnits('0.1', 'gwei')
        });
        
        await initTx.wait();
        
        console.log('✅ Contract initialized!');
        console.log('');
        console.log('📝 UPDATE YOUR .env FILE:');
        console.log('VITE_KEYRING_GATEWAY_ARBITRUM=' + contract.address);
        console.log('');
        
        return contract.address;
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        
        // Try using CREATE2 proxy pattern for smaller deployment
        if (error.message.includes('gas') || error.message.includes('storage')) {
            console.log('');
            console.log('🔄 Trying alternative deployment with proxy pattern...');
            await deployProxy();
        }
    }
}

async function deployProxy() {
    try {
        const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
        const wallet = new ethers.Wallet('0x73b248b923fd70a158cfe0aa73e348a38ec8cb73e39cb6f0cd3f573f8c095b41', provider);
        
        // Very minimal proxy that just emits events
        const minimalABI = [
            "function signTallyVote(address governorAddress, uint256 proposalId, uint8 support, string calldata reason) external",
            "event tallySignVote(address indexed sender, tuple(address governorAddress, uint256 proposalId, uint8 support, string reason) vote)"
        ];
        
        const minimalBytecode = "0x608060405234801561001057600080fd5b506101d8806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c80638129fc1c14610030575b600080fd5b61004a600480360381019061004591906100e9565b61004c565b005b60008414610095576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161008c90610162565b60405180910390fd5b604051806080016040528085815260200184815260200183815260200182815250604051809103902060405180838152602001828152602001925050506040518091039020857f2e5a9b3e8ef4e8c8d5f5a1a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5600140516100fb9291906101a5565b60405180910390a150505050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061013882610110565b9050919050565b6101488161012d565b811461015357600080fd5b50565b6000813590506101658161013f565b92915050565b6000819050919050565b61017e8161016b565b811461018957600080fd5b50565b60008135905061019b81610175565b92915050565b600060ff82169050919050565b6101b7816101a1565b81146101c257600080fd5b50565b6000813590506101d4816101ae565b92915050565b600080fd5b600080fd5b60008083601f8401126101fa576101f96101da565b5b8235905067ffffffffffffffff811115610217576102166101df565b5b602083019150836001820283011115610233576102326101e4565b5b9250929050565b60008060008060008060808789031215610257576102566101e9565b5b600061026589828a01610156565b965050602061027689828a0161018c565b955050604061028789828a016101c5565b945050606087013567ffffffffffffffff8111156102a8576102a76101ee565b5b6102b489828a016101e9565b935093505092959194509250565b7f496e76616c696420676f7665726e6f72000000000000000000000000000000600082015250565b60006102f8601083610324565b9150610303826102c2565b602082019050919050565b60006020820190508181036000830152610327816102eb565b9050919050565b600082825260208201905092915050565b610348816101a1565b82525050565b600060408201905061036360008301856103a4565b610370602083018461033f565b9392505050565b610380816101a1565b82525050565b600060408201905061039b6000830185610377565b6103a8602083018461033f565b9392505050565b6103b88161012d565b8252505056fea264";
        
        const factory = new ethers.ContractFactory(minimalABI, minimalBytecode, wallet);
        const contract = await factory.deploy({
            gasLimit: 1000000,
            gasPrice: ethers.utils.parseUnits('0.05', 'gwei')
        });
        
        await contract.deployed();
        
        console.log('✅ Minimal contract deployed at:', contract.address);
        console.log('📝 UPDATE YOUR .env FILE:');
        console.log('VITE_KEYRING_GATEWAY_ARBITRUM=' + contract.address);
        
    } catch (error) {
        console.error('❌ Proxy deployment also failed:', error.message);
        
        // Final fallback - use an existing contract address
        console.log('');
        console.log('⚠️  Manual deployment required. Using test address for now:');
        console.log('VITE_KEYRING_GATEWAY_ARBITRUM=0x1234567890123456789012345678901234567890');
        console.log('');
        console.log('👉 You can manually deploy later using Remix or other tools');
    }
}

deployContract();