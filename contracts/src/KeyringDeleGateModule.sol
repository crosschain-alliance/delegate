// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlEnumerableUpgradeable} from
    "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {IKeyringTarget} from "./interfaces/keyring/IKeyringTarget.sol";
import {Operation} from "./interfaces/keyring/Operation.sol";
import {IKeyringDeleGateModule} from "./interfaces/IKeyringDeleGateModule.sol";

contract KeyringDeleGateModule is
    IKeyringDeleGateModule,
    IKeyringTarget,
    UUPSUpgradeable,
    AccessControlEnumerableUpgradeable
{
    bytes32 public constant UPDATE_GATEWAY_ROLE = keccak256("UPDATE_GATEWAY_ROLE");
    bytes32 public constant ON_OPERATION_ROLE = keccak256("ON_OPERATION_ROLE");
    bytes32 public constant UPDATE_DELEGATE_ROLE = keccak256("UPDATE_DELEGATE_ROLE");

    address public gateway;
    address public expectedSigner;
    address public deleGate;
    uint256 public expectedSourceChainId;

    function initialize(
        address owner,
        address gateway_,
        address expectedSigner_,
        address deleGate_,
        uint256 expectedSourceChainId_
    ) public initializer {
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();

        gateway = gateway_;
        expectedSigner = expectedSigner_;
        deleGate = deleGate_;
        expectedSourceChainId = expectedSourceChainId_;

        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(UPDATE_GATEWAY_ROLE, owner);
        _grantRole(UPDATE_DELEGATE_ROLE, owner);
        _grantRole(ON_OPERATION_ROLE, gateway_);
    }

    function onOperation(address signer, Operation memory operation) external onlyRole(ON_OPERATION_ROLE) {
        require(signer == expectedSigner, InvalidSigner());
        require(address(bytes20(operation.sender)) == deleGate, NotDeleGate());
        require(operation.sourceChainId == expectedSourceChainId, InvalidSourceChainId());

        (address governor, uint256 proposalId, uint8 support) = abi.decode(operation.data, (address, uint256, uint8));
        IGovernor(governor).castVote(proposalId, support);
    }

    function updateDeleGate(address newDeleGate) external onlyRole(UPDATE_DELEGATE_ROLE) {
        deleGate = newDeleGate;
        emit DeleGateUpdated(newDeleGate);
    }

    function updateGateway(address newGateway) external onlyRole(UPDATE_GATEWAY_ROLE) {
        _revokeRole(ON_OPERATION_ROLE, gateway);
        _grantRole(ON_OPERATION_ROLE, newGateway);
        gateway = newGateway;
        emit GatewayUpdated(newGateway);
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
