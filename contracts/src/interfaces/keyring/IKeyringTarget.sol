// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Operation} from "./Operation.sol";

interface IKeyringTarget {
    function onOperation(address signer, Operation memory operation) external;
}
