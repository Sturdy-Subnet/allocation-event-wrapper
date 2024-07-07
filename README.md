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

Ensure you set the relevant env variables in a `.env` file before running the following (see [.env.example](.env.example)).

```shell
# install deps
npm install
# compile
npx hardhat compile
# run tests
npx hardhat test
# run logging example
npx hardhat run scripts/example.ts
# run sturdy silo example
npx hardhat run scripts/TestSturdyAllocator.ts
```

[SturdyAllocator.ts](scripts/SturdyAllocator.ts) contains a function which calls the chain given some parameters. It is up to the reader to define them (see [TestSturdyAllocator.ts](scripts/TestSturdyAllocator.ts) for an example on how this may be done).