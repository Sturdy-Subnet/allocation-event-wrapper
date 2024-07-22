//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AllocationLogger} from "./AllocationLogger.sol";
import {IDebtManager} from "./interfaces/IDebtManager.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract SturdyAllocator is Ownable {
    mapping(address => bool) allocators;

    constructor() {
        allocators[msg.sender] = true;
    }

    function setAllocator(address allocator, bool value) public onlyOwner {
        allocators[allocator] = value;
    }

    function _isAllocator(address toCheck) public view returns (bool) {
        return allocators[toCheck];
    }

    modifier onlyAllocator() {
        require(_isAllocator(msg.sender));
        _;
    }

    function allocate(
        bytes32 allocationUid,
        uint256 minerUid,
        address userAddress,
        address debtManager,
        address[] memory silos, // NOTE: the silos must be available to the addresses pointed to by  DebtManager(debtManager).vault()
        uint256[] memory allocationAmounts
    ) public onlyAllocator {
        if (!(silos.length == allocationAmounts.length)) {
            revert AllocationLogger.MismatchedArrays();
        }
        // rebalance pools
        IDebtManager.StrategyAllocation[]
            memory allocs = new IDebtManager.StrategyAllocation[](silos.length);

        for (uint256 i = 0; i < silos.length; i++) {
            allocs[i] = IDebtManager.StrategyAllocation(
                silos[i],
                allocationAmounts[i]
            );
        }

        IDebtManager(debtManager).manualAllocation(allocs);

        // Emit the event
        // AllocationLogger.logAllocation(allocationUid, minerUid, userAddress, silos, allocationAmounts);
        emit AllocationLogger.AllocationEvent(
            allocationUid,
            minerUid,
            userAddress,
            silos,
            allocationAmounts
        );
    }
}
