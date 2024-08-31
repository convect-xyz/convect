// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {EventEmitter} from "../src/EventEmitter.sol";

contract EventEmitterTest is Test {
    EventEmitter public eventEmitter;

    function setUp() public {
        eventEmitter = new EventEmitter();
    }

    function test_emitEvents() public {
        eventEmitter.emitEvents();
    }
}
