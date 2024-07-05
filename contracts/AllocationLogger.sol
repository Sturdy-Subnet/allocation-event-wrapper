//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library AllocationLogger {
    event AllocationEvent(
        string allocationUid,
        uint256 minerUid,
        address indexed userAddress,
        address[] allocatedPools,
        uint256[] allocationAmounts
    );
    error MismatchedArrays();

    function logAllocation(
        string memory allocationUid,
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