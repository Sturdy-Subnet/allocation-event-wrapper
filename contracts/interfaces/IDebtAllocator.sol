// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

interface IDebtAllocator {
    function update_debt(address _strategy, uint256 _targetDebt) external;

    function vault() external pure returns (address);

    function setManager(address _address, bool _allowed) external;
}
