//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AllocationLogger} from "./AllocationLogger.sol";
import {IVault} from "./interfaces/IVault.sol";
import {IStrategy} from "./interfaces/IStrategy.sol";
// import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract YearnAllocator {
    function allocate(
        bytes32 allocationUid,
        uint256 minerUid,
        address userAddress,
        address vaultAddress,
        address[] memory strategies, // NOTE: the strategies must be available to the addresses pointed to by  DebtManager(debtManager).vault()
        uint256[] memory allocationAmounts
    ) public {
        if(!(strategies.length == allocationAmounts.length)) {
            revert AllocationLogger.MismatchedArrays();
        }

        IVault vault = IVault(vaultAddress);
        // update debt of vaults
        for (uint256 i = 0; i < strategies.length; i++) {
            IVault.StrategyParams memory strategy = vault.strategies(strategies[i]);
            if (strategy.max_debt < allocationAmounts[i]) {
                vault.update_max_debt_for_strategy(strategies[i], allocationAmounts[i]);
            }
            vault.update_debt(strategies[i], allocationAmounts[i]);
        }

        // Emit the event
        // AllocationLogger.logAllocation(allocationUid, minerUid, userAddress, strategies, allocationAmounts);
        emit AllocationLogger.AllocationEvent(allocationUid, minerUid, userAddress, strategies, allocationAmounts);
    }
}