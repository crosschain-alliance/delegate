pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlEnumerableUpgradeable} from
    "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {IDeleGate} from "./interfaces/IDeleGate.sol";
import {ILLMAdapter} from "./interfaces/ILLMAdapter.sol";

contract DeleGate is IDeleGate, UUPSUpgradeable, AccessControlEnumerableUpgradeable {
    bytes32 public constant SET_LLM_ADAPTER_ADMIN_ROLE = keccak256(abi.encodePacked("SET_LLM_ADAPTER_ADMIN_ROLE"));
    bytes32 public constant SET_KMS_ADAPTER_ADMIN_ROLE = keccak256(abi.encodePacked("SET_KMS_ADAPTER_ADMIN_ROLE"));
    bytes32 public constant ON_ASWER_ROLE = keccak256(abi.encodePacked("ON_ASWER_ROLE"));

    mapping(address => Ethos) public usersEthos;
    address public llmAdapter;
    address public kmsAdapter;

    function initialize(address owner) public initializer {
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(SET_LLM_ADAPTER_ADMIN_ROLE, owner);
        _grantRole(SET_KMS_ADAPTER_ADMIN_ROLE, owner);
    }

    function castVoteFor(address voter, bytes calldata voteProof, string calldata vote) external {
        // TODO: verify zkTLS proof (voteProof)
        Ethos memory ethos = usersEthos[voter];

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

        ILLMAdapter(llmAdapter).ask(prompt);
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

    function onAnswer() external onlyRole(ON_ASWER_ROLE) {
        // TODO: trigger KMSAdapter to sign
    }

    function setLlmAdapter(address llmAdapter_) external onlyRole(SET_LLM_ADAPTER_ADMIN_ROLE) {
        _revokeRole(ON_ASWER_ROLE, llmAdapter);
        _grantRole(ON_ASWER_ROLE, llmAdapter_);
        llmAdapter = llmAdapter_;
        emit LLMAdapterSet(llmAdapter_);
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
