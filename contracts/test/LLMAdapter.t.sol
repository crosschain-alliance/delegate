// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {LLMAdapter} from "../src/adapters/LLMAdapter.sol";

contract LLMAdapterTest is Test {
    LLMAdapter public adapter;
    address public user = address(1);

    event QueryCall(uint256 queryId, string query);
    event QueryResponse(uint256 queryId, string response);

    function setUp() public {
        adapter = new LLMAdapter();
        vm.label(address(adapter), "LLMAdapter");
        vm.label(user, "User");
    }

    function test_Query() public {
        string memory queryText = "What is the capital of France?";

        vm.expectEmit(true, true, true, true);
        emit QueryCall(uint256(keccak256(abi.encodePacked(queryText, block.timestamp))), queryText);

        adapter.query(queryText);
    }

    function test_Response() public {
        string memory queryText = "What is the capital of France?";
        uint256 queryId = uint256(keccak256(abi.encodePacked(queryText, block.timestamp)));
        string memory responseText = "Paris";

        // First query
        adapter.query(queryText);

        // Then respond
        vm.expectEmit(true, true, true, true);
        emit QueryResponse(queryId, responseText);

        adapter.respond(queryId, responseText);

        // Verify response is stored
        assertEq(adapter.queries(queryId), responseText);
    }

    function test_RevertWhen_DuplicateResponse() public {
        string memory queryText = "What is the capital of France?";
        uint256 queryId = uint256(keccak256(abi.encodePacked(queryText, block.timestamp)));

        adapter.query(queryText);
        adapter.respond(queryId, "Paris");

        vm.expectRevert("Response already exists for this queryId");
        adapter.respond(queryId, "London");
    }

    function test_QueryFromDifferentUser() public {
        string memory queryText = "What is the capital of France?";

        vm.prank(user);
        vm.expectEmit(true, true, true, true);
        emit QueryCall(uint256(keccak256(abi.encodePacked(queryText, block.timestamp))), queryText);

        adapter.query(queryText);
    }

    function test_GetResponse() public {
        string memory queryText = "What is the capital of France?";
        uint256 queryId = uint256(keccak256(abi.encodePacked(queryText, block.timestamp)));
        string memory responseText = "Paris";

        adapter.query(queryText);
        adapter.respond(queryId, responseText);

        assertEq(adapter.getResponse(queryId), responseText);
    }
}
