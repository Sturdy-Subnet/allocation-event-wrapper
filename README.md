# Allocation event wrapper

This repository houses a wrapper which can used to execute rebalances across pools based on Sturdy Subnet's provided allocations, and subsequently log this action to be queried later and displayed on our dashboard. Here's what the event looks like:

```solidity
event AllocationEvent(
    bytes32 indexed allocationUid,
    uint256 indexed minerUid,
    address indexed userAddress,
    address[] allocatedPools,
    uint256[] allocationAmounts
);
```

Ensure you set the relevant env variables in a `.env` file before running the following (see [.env.example](.env.example)).


## Setup
```shell
# install deps
npm install
# compile
npx hardhat compile
```

## Tests, and Other Fun Scripts
```shell
# run tests
npx hardhat test
# run logging example
npx hardhat run scripts/example.ts
# run sturdy silo example (run a local hardhat node with npx hardhat node first)
npx hardhat run scripts/TestSturdyAllocator.ts --network localhost
```

## Deployment and Usage
```shell
# deploy SturdyAllocator.sol
npx hardhat run scripts/DeploySturdyAllocator.ts --network mainnet
# Perform allocations (rebalance selected vault every 24 hours):
npx hardhat run scripts/RunSturdyAllocator.ts --network mainnet
# set custom debt manager per script run (can be used to refer to different vaults)
DEBT_MANAGER="0x3f1...063" npx hardhat run scripts/RunSturdyAllocator.ts --network mainnet
# example - rebalancing crvusd aggregator:
DEBT_MANAGER=0x3f1e01C07539b9E4941ab58b1258CBB6c4066063 npx hardhat run scripts/RunSturdyAllocator.ts --network mainnet
```

[SturdyAllocator.ts](scripts/SturdyAllocator.ts) contains a function which rebalances a Sturdy Finance Aggregator given some parameters. It is up to the reader to define them (see [TestSturdyAllocator.ts](scripts/TestSturdyAllocator.ts) for an example on how this may be done). We provide the allocation script used by sturdy.finance to rebalance their aggregators in [RunSturdyAllocator.ts](./scripts/RunSturdyAllocator.ts).