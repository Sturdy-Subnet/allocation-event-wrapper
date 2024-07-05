# Allocation event wrapper

This repository houses a wrapper which can used to execute rebalances across pools based on Sturdy Subnet's provided allocations, and subsequently log this action to be queried later and displayed on our dashboard. Here's what the event looks like:

```solidity
event AllocationEvent(
    string allocationUid,
    uint256 minerUid,
    address indexed userAddress,
    address[] allocatedPools,
    uint256[] allocationAmounts
);
```

```shell
# install deps
npm install
# compile
npx hardhat compile
# run tests
npx hardhat test
# run example
npx hardhat run scripts/example.ts
```