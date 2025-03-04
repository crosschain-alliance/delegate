// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IKMSAdapter} from "../interfaces/IKMSAdapter.sol";
import {IKeyringGateway} from "../interfaces/IKeyringGateway.sol";

contract KMSAdapter is IKMSAdapter {
    address public immutable KEYRING_GATEWAY;

    constructor(address keyringGateway) {
        KEYRING_GATEWAY = keyringGateway;
    }

    function sign(uint256 targetChainId, bytes calldata target, bytes calldata data) external {
        IKeyringGateway(KEYRING_GATEWAY).sign(uint64(targetChainId), target, data);
    }
}
