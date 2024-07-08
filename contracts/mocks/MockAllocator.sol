//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AllocationLogger} from "../AllocationLogger.sol";

contract MockAllocator {
    function allocate(
        bytes32 allocationUid,
        uint256 minerUid,
        address userAddress,
        address[] memory allocatedPools,
        uint256[] memory allocationAmounts
    ) public {
        // Emit the event
        AllocationLogger.logAllocation(allocationUid, minerUid, userAddress, allocatedPools, allocationAmounts);
    }
}