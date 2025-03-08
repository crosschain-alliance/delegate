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
        address voter;
        bytes target;
    }

    event EndVoteCast(address indexed user, bytes32 promptId);
    event EthosDefined(address indexed user, Ethos ethos);
    event LLMAdapterSet(address llmAdapter);
    event KMSAdapterSet(address indexed user, address kmsAdapter);
    event StartVoteCast(address indexed user, bytes32 promptId);

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

    function getUserEthos(address user) external view returns (Ethos memory);

    function getUserKmsAdapter(address user) external view returns (address);

    function onAnswer(bytes32 promptId, string calldata answer) external;

    function setLlmAdapter(address llmAdapter) external;

    function setKmsAdapter(address kmsAdapter) external;
}
