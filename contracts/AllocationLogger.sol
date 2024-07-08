//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library AllocationLogger {
    event AllocationEvent(
        bytes32 indexed allocationUid,
        uint256 indexed minerUid,
        address indexed userAddress,
        address[] allocatedPools,
        uint256[] allocationAmounts
    );
    error MismatchedArrays();

    function logAllocation(
        bytes32 allocationUid,
        uint256 minerUid,
        address userAddress,
        address[] memory allocatedPools,
        uint256[] memory allocationAmounts
    ) internal {
        if(!(allocatedPools.length == allocationAmounts.length)) {
            revert MismatchedArrays();
        }

        // Emit the event
        emit AllocationEvent(allocationUid, minerUid, userAddress, allocatedPools, allocationAmounts);
    }
}