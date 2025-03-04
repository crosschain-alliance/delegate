pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlEnumerableUpgradeable} from
    "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {IDeleGate} from "./interfaces/IDeleGate.sol";
import {ILLMAdapter} from "./interfaces/ILLMAdapter.sol";
import {IKMSAdapter} from "./interfaces/IKMSAdapter.sol";

contract DeleGate is IDeleGate, UUPSUpgradeable, AccessControlEnumerableUpgradeable {
    bytes32 public constant SET_LLM_ADAPTER_ADMIN_ROLE = keccak256(abi.encodePacked("SET_LLM_ADAPTER_ADMIN_ROLE"));
    bytes32 public constant SET_KMS_ADAPTER_ADMIN_ROLE = keccak256(abi.encodePacked("SET_KMS_ADAPTER_ADMIN_ROLE"));
    bytes32 public constant ON_ASWER_ROLE = keccak256(abi.encodePacked("ON_ASWER_ROLE"));

    mapping(address => Ethos) public usersEthos;
    mapping(bytes32 => PendingPromptData) private _pendingPromptData;
    address public llmAdapter;
    address public kmsAdapter;

    function initialize(address owner) public initializer {
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(SET_LLM_ADAPTER_ADMIN_ROLE, owner);
        _grantRole(SET_KMS_ADAPTER_ADMIN_ROLE, owner);
    }

    function castVoteFor(
        address voter,
        string calldata vote,
        uint256 targetChainId,
        bytes calldata target,
        bytes calldata voteProof
    ) external {
        // TODO: verify zkTLS proof (voteProof)
        Ethos memory ethos = usersEthos[voter];

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
        _pendingPromptData[promptId] = PendingPromptData({targetChainId: targetChainId, target: target});
    }

    function defineEthos(Ethos calldata ethos) external {
        require(
            abi.encodePacked(ethos.values).length > 0 && abi.encodePacked(ethos.principles).length > 0
                && abi.encodePacked(ethos.interests).length > 0,
            InvalidEthos()
        );
        usersEthos[msg.sender] = ethos;
        emit EthosDefined(msg.sender, ethos);
    }

    function onAnswer(bytes32 promptId, bytes calldata answer) external onlyRole(ON_ASWER_ROLE) {
        // NOTE: answer must be = abi.encode(governorAddress, proposalId, support)
        PendingPromptData storage promptData = _pendingPromptData[promptId];
        IKMSAdapter(kmsAdapter).sign(promptData.targetChainId, promptData.target, answer);
        delete _pendingPromptData[promptId];
    }

    function setLlmAdapter(address newLlmAdapter) external onlyRole(SET_LLM_ADAPTER_ADMIN_ROLE) {
        _revokeRole(ON_ASWER_ROLE, llmAdapter);
        _grantRole(ON_ASWER_ROLE, newLlmAdapter);
        llmAdapter = newLlmAdapter;
        emit LLMAdapterSet(newLlmAdapter);
    }

    function setKmsAdapter(address newKmsAdapter) external onlyRole(SET_KMS_ADAPTER_ADMIN_ROLE) {
        kmsAdapter = newKmsAdapter;
        emit KMSAdapterSet(newKmsAdapter);
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
