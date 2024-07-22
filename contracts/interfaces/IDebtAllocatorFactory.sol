// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

interface IDebtAllocatorFactory {
    function setKeeper(address _address, bool _allowed) external;
}
