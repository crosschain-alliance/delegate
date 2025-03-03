// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract LLMAdapter {
    event QueryCall(uint256 queryId, string query);
    event QueryResponse(uint256 queryId, string response);

    mapping(uint256 => string) public queries;

    function query(string calldata queryText) public {
        emit QueryCall(uint256(keccak256(abi.encodePacked(queryText, block.timestamp))), queryText);
    }

    function respond(uint256 queryId, string calldata responseText) public {
        require(bytes(queries[queryId]).length == 0, "Response already exists for this queryId");
        queries[queryId] = responseText;
        emit QueryResponse(queryId, responseText);
    }

    function getResponse(uint256 queryId) public view returns (string memory) {
        return queries[queryId];
    }
}
