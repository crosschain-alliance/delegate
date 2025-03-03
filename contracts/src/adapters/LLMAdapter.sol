// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract LLMAdapter {
    error ResponseAlreadyExists(uint256 queryId);
    event QueryCall(uint256 queryId, string query);
    event QueryResponse(uint256 queryId, string response);

    mapping(uint256 => string) public queries;

    function query(string calldata queryText) public {
        emit QueryCall(uint256(keccak256(abi.encodePacked(block.chainid, queryText, block.timestamp))), queryText);
    }

    function respond(uint256 queryId, string calldata responseText) public {
        if (bytes(queries[queryId]).length != 0) {
            revert ResponseAlreadyExists(queryId);
        }
        queries[queryId] = responseText;

        emit QueryResponse(queryId, responseText);
    }

    function getResponse(uint256 queryId) public view returns (string memory) {
        return queries[queryId];
    }
}