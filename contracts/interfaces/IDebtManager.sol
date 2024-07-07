// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

interface IDebtManager {
    struct StrategyAllocation {
        address strategy;
        uint256 debt;
    }
    function manualAllocation( StrategyAllocation[] memory _newPositions) external payable;
}