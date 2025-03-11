// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IKMSAdapter {
    error NotDeleGate();

    function sign(uint256 targetChainId, bytes calldata target, bytes calldata data) external;
}
