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
        bytes target;
    }

    event EthosDefined(address user, Ethos ethos);
    event LLMAdapterSet(address llmAdapter);
    event KMSAdapterSet(address kmsAdapter);

    error InvalidEthos();

    function castVoteFor(
        address voter,
        string calldata vote,
        uint256 targetChainId,
        bytes calldata target,
        bytes calldata voteProof
    ) external;

    function defineEthos(Ethos calldata ethos) external;

    function onAnswer(bytes32 promptId, bytes calldata answer) external;

    function setLlmAdapter(address llmAdapter_) external;

    function setKmsAdapter(address kmsAdapter_) external;
}
