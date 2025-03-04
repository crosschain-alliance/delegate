// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ILLMAdapter {
    enum PromptStatus {
        NotInitiated,
        Initiated,
        Completed
    }

    event Asked(bytes32 promptId, string prompt);
    event Answered(bytes32 promptId, bytes response);

    error ResponseAlreadyExists(bytes32 promptId);
    error InvalidPromptStatus();

    function ask(string calldata prompt) external returns (bytes32);

    function respond(bytes32 promptId, bytes calldata response, bytes calldata proof) external;
}
