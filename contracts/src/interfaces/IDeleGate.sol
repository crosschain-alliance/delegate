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
        bytes data;
    }

    event EndVoteCast(address indexed voter, bytes32 promptId);
    event EthosDefined(address indexed user, Ethos ethos);
    event LLMAdapterSet(address llmAdapter);
    event KMSAdapterSet(address indexed user, address kmsAdapter);
    event StartVoteCast(address indexed voter, bytes32 promptId);

    error InvalidEthos();
    error InvalidKmsAdapter();
    error InvalidPromptData();

    function castGovernorVoteFor(
        address voter,
        uint256 targetChainId,
        address governor,
        uint256 proposalId,
        string calldata vote,
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
