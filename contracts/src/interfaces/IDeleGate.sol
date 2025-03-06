// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IDeleGate {
    struct Ethos {
        string interests;
        string principles;
        string values;
    }

    struct PendingPromptData {
        uint256 targetChainId;
        address user;
        bytes target;
    }

    event EthosDefined(address indexed user, Ethos ethos);
    event LLMAdapterSet(address llmAdapter);
    event KMSAdapterSet(address indexed user, address kmsAdapter);

    error InvalidEthos();
    error InvalidKmsAdapter();
    error InvalidPromptData();

    function castVoteFor(
        address voter,
        string calldata vote,
        uint256 targetChainId,
        bytes calldata target,
        bytes calldata voteProof
    ) external;

    function defineEthos(Ethos calldata ethos) external;

    function onAnswer(bytes32 promptId, bytes calldata answer) external;

    function setLlmAdapter(address llmAdapter) external;

    function setKmsAdapter(address kmsAdapter) external;
}
