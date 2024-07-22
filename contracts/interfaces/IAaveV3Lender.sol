// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

interface IAaveV3Lender {
    function lendingPool() external pure returns (address);
}
