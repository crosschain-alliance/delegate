// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {KeyringGateway} from "../src/KeyringGateway.sol";
import {KMSAdapter} from "../src/adapters/KMSAdapter.sol";
import {KeyringDeleGateModule} from "../src/KeyringDeleGateModule.sol";
import {DeleGate} from "../src/DeleGate.sol";
import {LLMAdapter} from "../src/adapters/LLMAdapter.sol";

contract DeployAll is Script {
    function run() public {
        // Pull values from environment variables
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("OWNER");
        address expectedSigner = vm.envAddress("SIGNER");
        uint256 chainId = vm.envUint("CHAIN_ID");

        vm.startBroadcast(privateKey);

        // Deploy KeyringGateway and initialize it
        KeyringGateway keyringGateway = new KeyringGateway();
        keyringGateway.initialize(owner);

        // Deploy Delegate contract
        DeleGate delegateContract = new DeleGate();
        delegateContract.initialize(owner);
        // Note: Add initialization/setup to Delegate if required.

        // Deploy LLMAdapter and set it in the Delegate contract
        LLMAdapter llmAdapter = new LLMAdapter(address(delegateContract));
        // This call sets llmAdapter as the new LLM adapter in Delegate.
        delegateContract.setLlmAdapter(address(llmAdapter));

        // Deploy KMSAdapter using the KeyringGateway and Delegate addresses
        // KMSAdapter kmsAdapter = new KMSAdapter(address(keyringGateway), address(delegateContract));

        // Deploy KeyringDeleGateModule using addresses from deployed contracts
        // KeyringDeleGateModule module = new KeyringDeleGateModule(
        //     owner,                     // owner address
        //     address(keyringGateway),   // gateway address
        //     expectedSigner,            // expected signer address
        //     address(kmsAdapter),       // kms adapter address
        //     chainId                    // expected source chain id
        // );

        console.log("KeyringGateway deployed at:", address(keyringGateway));
        console.log("Delegate (DeleGate) deployed at:", address(delegateContract));
        console.log("LLMAdapter deployed at:", address(llmAdapter));
        // console.log("KMSAdapter deployed at:", address(kmsAdapter));
        // console.log("KeyringDeleGateModule deployed at:", address(module));

        vm.stopBroadcast();
    }
}