//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AllocationLogger} from "./AllocationLogger.sol";
import {IVault} from "./interfaces/IVault.sol";
import {IDebtAllocator} from "./interfaces/IDebtAllocator.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract YearnAllocator is Ownable {
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
        address debtAllocatorAddress,
        address[] memory underlyingPools,
        uint256[] memory allocationAmounts
    ) public onlyAllocator {
        IDebtAllocator debtAllocator = IDebtAllocator(debtAllocatorAddress);
        IVault vault = IVault(debtAllocator.vault());
        address[] memory strategies = vault.get_default_queue();

        if (!(strategies.length == allocationAmounts.length)) {
            revert AllocationLogger.MismatchedArrays();
        }

        // update debt of vaults
        for (uint256 i = 0; i < strategies.length; i++) {
            debtAllocator.update_debt(strategies[i], allocationAmounts[i]);
        }

        // Emit the event
        // AllocationLogger.logAllocation(allocationUid, minerUid, userAddress, strategies, allocationAmounts);
        emit AllocationLogger.AllocationEvent(
            allocationUid,
            minerUid,
            address(vault),
            underlyingPools,
            allocationAmounts
        );
    }
}
