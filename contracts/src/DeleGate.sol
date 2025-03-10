pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlEnumerableUpgradeable} from
    "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {JsonParser} from "./libraries/JsonParser.sol";
import {IDeleGate} from "./interfaces/IDeleGate.sol";
import {ILLMAdapter} from "./interfaces/ILLMAdapter.sol";
import {IKMSAdapter} from "./interfaces/IKMSAdapter.sol";

contract DeleGate is IDeleGate, UUPSUpgradeable, AccessControlEnumerableUpgradeable {
    bytes32 public constant SET_LLM_ADAPTER_ADMIN_ROLE = keccak256(abi.encodePacked("SET_LLM_ADAPTER_ADMIN_ROLE"));
    bytes32 public constant ON_ASWER_ROLE = keccak256(abi.encodePacked("ON_ASWER_ROLE"));

    mapping(address => Ethos) private _usersEthos;
    mapping(bytes32 => PendingPromptData) private _pendingPromptData;
    mapping(address => address) private _usersKmsAdapter;
    address public llmAdapter;

    function initialize(address owner) public initializer {
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(SET_LLM_ADAPTER_ADMIN_ROLE, owner);
    }

    function castGovernorVoteFor(
        address voter,
        string calldata vote,
        uint256 targetChainId,
        address governor,
        uint256 proposalId,
        bytes calldata target,
        bytes calldata voteProof
    ) external {
        // TODO: verify zkTLS proof (voteProof)
        Ethos memory ethos = _usersEthos[voter];
        _validateEthos(ethos);
        _checkKmsAdapterExistence(msg.sender);

        // TODO: extract proposalId, and governor contract from vote

        string memory prompt = string(
            abi.encodePacked(
                "given this vote: ",
                vote,
                ". Consider to return a result based on the following interests: ",
                ethos.interests,
                ", the following principles: ",
                ethos.principles,
                " and the following values: ",
                ethos.values
            )
        );

        bytes32 promptId = ILLMAdapter(llmAdapter).ask(prompt);
        _pendingPromptData[promptId] = PendingPromptData({
            targetChainId: targetChainId,
            target: target,
            voter: voter,
            data: abi.encode(governor, proposalId)
        });
        emit StartVoteCast(voter, promptId);
    }

    function defineEthos(Ethos calldata ethos) external {
        _validateEthos(ethos);
        _usersEthos[msg.sender] = ethos;
        emit EthosDefined(msg.sender, ethos);
    }

    function getUserEthos(address user) external view returns (Ethos memory) {
        return _usersEthos[user];
    }

    function getUserKmsAdapter(address user) external view returns (address) {
        return _usersKmsAdapter[user];
    }

    function onAnswer(bytes32 promptId, string calldata answer) external onlyRole(ON_ASWER_ROLE) {
        // NOTE: answer must be = abi.encode(governorAddress, proposalId, support)
        PendingPromptData storage promptData = _pendingPromptData[promptId];
        require(promptData.targetChainId != 0, InvalidPromptData());

        (address governor, uint256 proposalId) = abi.decode(promptData.data, (address, uint256));

        IKMSAdapter(_usersKmsAdapter[promptData.voter]).sign(
            promptData.targetChainId,
            promptData.target,
            abi.encode(governor, proposalId, JsonParser.parseUintArray(answer)[0])
        );
        emit EndVoteCast(promptData.voter, promptId);
        delete _pendingPromptData[promptId];
    }

    function setLlmAdapter(address newLlmAdapter) external onlyRole(SET_LLM_ADAPTER_ADMIN_ROLE) {
        _revokeRole(ON_ASWER_ROLE, llmAdapter);
        _grantRole(ON_ASWER_ROLE, newLlmAdapter);
        llmAdapter = newLlmAdapter;
        emit LLMAdapterSet(newLlmAdapter);
    }

    function setKmsAdapter(address kmsAdapter) external {
        // NOTE: Each user must deploy their own `KmsAdapter` because the KeyringGateway needs to associate
        // a unique key with each user (msg.sender). In this context, the msg.sender within KeyringGateway.executeOperation
        // is referenced by the `KmsAdapter`.
        _usersKmsAdapter[msg.sender] = kmsAdapter;
        emit KMSAdapterSet(msg.sender, kmsAdapter);
    }

    function _checkKmsAdapterExistence(address user) internal view {
        require(_usersKmsAdapter[user] != address(0), InvalidKmsAdapter());
    }

    function _validateEthos(Ethos memory ethos) internal pure {
        require(
            abi.encodePacked(ethos.values).length > 0 && abi.encodePacked(ethos.principles).length > 0
                && abi.encodePacked(ethos.interests).length > 0,
            InvalidEthos()
        );
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
