// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EventEmitter {
    // Declare events
    event TimestampEmitted(uint256 timestamp);
    event BlockNumberEmitted(uint256 blockNumber);
    event SenderEmitted(address sender);

    // Function to emit all three events
    function emitEvents() public {
        emit TimestampEmitted(block.timestamp); // Emit current block timestamp
        emit BlockNumberEmitted(block.number); // Emit current block number
        emit SenderEmitted(msg.sender); // Emit sender's address
    }
}
