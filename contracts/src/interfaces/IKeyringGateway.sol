// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IKeyringGateway {
    function sign(uint64 targetChainId, bytes calldata target, bytes calldata data) external;
}
