// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {LLMAdapter} from "../src/adapters/LLMAdapter.sol";

contract LLMAdapterDeploy is Script {
    function setUp() public {}

    function run() public {
        // Use default private key if none provided
        uint256 deployerPrivateKey =
            vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));

        vm.startBroadcast(deployerPrivateKey);

        LLMAdapter adapter = new LLMAdapter(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);

        console.log("LLMAdapter deployed to:", address(adapter));

        vm.stopBroadcast();
    }
}
