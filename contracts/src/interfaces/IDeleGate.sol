// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IDeleGate {
    struct Ethos {
        string interests;
        string principles;
        string values;
    }

    event EthosDefined(address user, Ethos ethos);
    event LLMAdapterSet(address llmAdapter);

    error InvalidEthos();

    function castVoteFor(address voter, bytes calldata voteProof, string calldata vote) external;

    function defineEthos(Ethos calldata ethos) external;

    function onAnswer() external;

    function setLlmAdapter(address llmAdapter_) external;
}
