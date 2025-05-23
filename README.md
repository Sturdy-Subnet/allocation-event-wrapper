# Sturdy Subnet - Allocation Event Wrappers

This repository houses wrapper(s) which can be used to execute rebalances across pools based on Sturdy Subnet's provided allocations, and subsequently log this action to be queried later and displayed on our dashboard. Here's what the event looks like:

```solidity
event AllocationEvent(
    bytes32 indexed allocationUid,
    uint256 indexed minerUid,
    address indexed userAddress,
    address[] allocatedPools,
    uint256[] allocationAmounts
);
```

Ensure you set the relevant env variables in a `.env` file while following along OR before running the following (see [.env.example](.env.example)).


## Setup

### Install pnpm
https://pnpm.io/installation

### Dependencies
```shell
# install deps
pnpm install
# compile
pnpm exec hardhat compile
```

## Tests
```shell
# run tests
pnpm exec hardhat test
```

## Sturdy - Direct API Call - Deployment and Usage
```shell
# deploy SturdyAllocator.sol
CONTRACT_NAME=SturdyAllocator pnpm exec hardhat run scripts/DeployAllocator.ts --network mainnet
# set manual allocator of debt manager
pnpm exec hardhat run scripts/UpdateDebtManagerAllocator.ts --network mainnet
# Perform allocations (rebalance selected vault every 24 hours):
pnpm exec hardhat run scripts/RunSturdyAllocator.ts --network mainnet
# set custom debt manager per script run (can be used to refer to different vaults)
STURDY_DEBT_MANAGER="0x3f1...063" pnpm exec hardhat run scripts/UpdateDebtManagerAllocator.ts --network mainnet
STURDY_DEBT_MANAGER="0x3f1...063" pnpm exec hardhat run scripts/RunSturdyAllocator.ts --network mainnet
# example - rebalancing crvusd aggregator:
STURDY_DEBT_MANAGER=0x3f1e01C07539b9E4941ab58b1258CBB6c4066063 pnpm exec hardhat run scripts/UpdateDebtManagerAllocator.ts --network mainnet
STURDY_DEBT_MANAGER=0x3f1e01C07539b9E4941ab58b1258CBB6c4066063 pnpm exec hardhat run scripts/RunSturdyAllocator.ts --network mainnet
```

## Yearn Airnode-driven allocator (Example - works on Dai Vault) - Deployment and Usage
```shell
# deploy YearnAirnodeAllocator.sol
pnpm exec hardhat run scripts/DeployYearnAirnodeAllocator.ts --network mainnet
# set the allocator as the manager and keeper of a debt allocator of a vault
# otherwise the allocator script will not be able to apply allocations
pnpm exec hardhat run scripts/YearnUpdateDebtManager.ts --network mainnet
# run example allocation request script - this example only 
# works for Yearn's dai vault. NOTE: this script does not 
# fulfill the request. This needs to be done manually by
# calling applyAllocation() in the allocator contract
pnpm exec hardhat run scripts/RunYearnAirnodeAllocator.ts --network mainnet
```

## Yearn Direct API Call (Example - works on Dai Vault) - Deployment and Usage
```shell
# deploy YearnAllocator.sol
CONTRACT_NAME=YearnAllocator pnpm exec hardhat run scripts/DeployAllocator.ts --network mainnet
# Perform allocations (rebalance selected vault every 24 hours):
pnpm exec hardhat run scripts/RunYearnAllocator.ts --network mainnet
# set custom debt manager per script run (can be used to refer to different vaults)
YEARN_DEBT_ALLOCATOR="0x3f1...063" YEARN_DEBT_MANAGER="0x163...ff7" pnpm exec hardhat run scripts/RunYearnAllocator.ts --network mainnet
```


[SturdyAllocator.ts](scripts/SturdyAllocator.ts) contains a function which rebalances a Sturdy Finance Aggregator given some parameters. It is up to the reader to define them (see [TestSturdyAllocator.ts](scripts/TestSturdyAllocator.ts) for an example on how this may be done). We provide the allocation script used by sturdy.finance to rebalance their aggregators in [RunSturdyAllocator.ts](./scripts/RunSturdyAllocator.ts).
