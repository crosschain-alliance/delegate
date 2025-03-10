// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Upgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";
import {Script, console} from "forge-std/Script.sol";
import {DeleGate} from "../src/DeleGate.sol";

contract DeleGateDeploy is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey =
            vm.envOr("PRIVATE_KEY", uint256(0xa207dae2dfe8fee4ec7cf676c0e22d87e757b021cff44ac16ed48efd9a7ca066));

        vm.startBroadcast(deployerPrivateKey);

        address proxy = Upgrades.deployUUPSProxy(
            "DeleGate.sol", abi.encodeCall(DeleGate.initialize, (0xc36f349c41aE65a77B61CaD7488D67699a89E07C))
        );

        console.log("DeleGate deployed to:", address(proxy));

        vm.stopBroadcast();
    }
}
