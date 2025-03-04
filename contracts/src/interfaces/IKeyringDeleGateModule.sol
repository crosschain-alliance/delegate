// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IKeyringDeleGateModule {
    event DeleGateUpdated(address deleGate);
    event GatewayUpdated(address gateway);

    error InvalidSigner();
    error NotDeleGate();
    error InvalidSourceChainId();

    function updateGateway(address newGateway) external;

    function updateDeleGate(address newDeleGate) external;
}
