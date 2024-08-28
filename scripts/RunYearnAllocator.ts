// eslint-disable-next-line node/no-missing-import
import { run } from "./YearnAllocator";
import { ethers } from "hardhat";
import axios from "axios";
import dotenv from "dotenv";
import { BigNumberish } from "ethers";
// eslint-disable-next-line node/no-missing-import
import { IDebtAllocator, IPool, IVault } from "../typechain";
import {
  MinerAllocation,
  Pools,
  RequestData,
  SturdySubnetResponse,
  // eslint-disable-next-line node/no-missing-import
} from "./AllocatorTypes";

/**
 * contains mappings for pools - by default anything that isn't mapped
 * it's underlying pool is considered to AAVE pool
 */
const underlyingTypesMap = new Map<string, string>([
  ["0x83F20F44975D03b1b09e64809B757c47f942BEeA", "DAI_SAVINGS"],
]);

async function runAllocator() {
  console.log("attempting to rebalance vault...");
  dotenv.config();

  const apiKey = process.env.STURDY_VALI_API_KEY || ""; // Validator API Key
  const url = process.env.HOST_URL || ""; // endpoint url containing validator domain and endpoint for allocations (usually /allocate)

  const acct = (await ethers.getSigners())[0];

  const debtAllocator: IDebtAllocator = (await ethers.getContractAt(
    "IDebtAllocator",
    process.env.YEARN_DEBT_ALLOCATOR || ""
  )) as IDebtAllocator;

  const vaultAddress: string = await debtAllocator.connect(acct).vault();
  const vault: IVault = (await ethers.getContractAt(
    "contracts/DebtManager.sol:IVault",
    vaultAddress
  )) as IVault;
  // obtain parameters needed for sturdy subnet allocation request
  const totalAssets = await vault.connect(acct).totalAssets();
  // obtain the different silos the vault is responsible for
  const strategies: string[] = await vault.connect(acct).get_default_queue();
  const pools: Pools = await (async () => {
    const entries = await Promise.all(
      strategies.map(async (contractAddress) => {
        let tokenAddress = contractAddress;
        const strategy: IVault = (await ethers.getContractAt(
          "contracts/interfaces/IVault.sol:IERC4626",
          contractAddress
        )) as IVault;
        const pool_name = await strategy.connect(acct).name();
        // Assumes by default that the underlying pool being allocated to is an aave contract
        const poolType: string =
          underlyingTypesMap.get(contractAddress) || "AAVE";

        if (poolType === "AAVE") {
          const strategyContract = await ethers.getContractAt(
            "IAaveV3Lender",
            contractAddress
          );
          // obtain pool address
          const poolAddress = await strategyContract
            .connect(acct)
            .lendingPool();
          const poolContract: IPool = (await ethers.getContractAt(
            "IPool",
            poolAddress
          )) as IPool;
          const underlyingAddress = await vault.connect(acct).asset();
          // obtain atoken address
          const reserveData = await poolContract
            .connect(acct)
            .getReserveData(underlyingAddress);
          tokenAddress = reserveData.aTokenAddress;
        }

        const entry = {
          pool_model_disc: "CHAIN",
          pool_type: poolType,
          pool_id: pool_name,
          contract_address: tokenAddress,
        };
        
        return [pool_name, entry];
      })
    );
    return Object.fromEntries(entries);
  })();

  // this request will be sent to the sturdy subnet validator API
  const requestData: RequestData = {
    request_type: "ORGANIC",
    user_address: vaultAddress,
    assets_and_pools: {
      total_assets: totalAssets.toLocaleString(),
      pools: pools,
    },
  };

  console.log(`sending data`);
  console.log(JSON.stringify(requestData, null, 2))
  
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  };

  const sendAllocationRequest = async () => {
    // eslint-disable-next-line no-useless-catch
    try {
      const response = await axios.post(url, requestData, config);
      const responseData: SturdySubnetResponse = response.data;
      return responseData;
    } catch (error) {
      throw error;
    }
  };

  const allocs: SturdySubnetResponse = await sendAllocationRequest();
  const poolAddresses: string[] = Object.keys(requestData.assets_and_pools.pools);

  Array.from(Object.entries(allocs.allocations)).forEach(
    entry => {
      const allocations: { [key: string]: number } = entry[1].allocations;
      Object.keys(requestData.assets_and_pools.pools).forEach(
        function(allocContractAddr: string) {
          if(!(poolAddresses.includes(allocContractAddr))){
            console.log(`${allocContractAddr} not in ${poolAddresses}`)
            entry[1].allocations[allocContractAddr] = 0.0;
          }
        }
      )
    }
  )

  const requestUuid: string = allocs.request_uuid;

  console.log("allocations:", JSON.stringify(allocs));
  console.log("request uuid:", requestUuid);

  const sortedAllocations: [BigNumberish, MinerAllocation][] = Object.entries(
    allocs.allocations
  )
    .map(([uid, data]) => {
      // data.uid = uid;
      const ret: [BigNumberish, MinerAllocation] = [uid, data];
      return ret;
    })
    .sort(([uidA, a], [uidB, b]) => b.apy - a.apy); // Sort by APY in descending order

  const poolUids: string[] = Object.keys(sortedAllocations[0][1].allocations)
  const allocatedPools: string[] = poolUids.map((uid) => ethers.utils.getAddress(requestData.assets_and_pools.pools[uid].contract_address));
  const allocationAmounts: BigNumberish[] = Object.values(
    sortedAllocations[0][1].allocations
  ).map((amount) =>
    ethers.BigNumber.from(
      Number(amount).toLocaleString("fullwide", { useGrouping: false })
    )
  );
  const userAddress: string = requestData.user_address || "";
  const minerUid = sortedAllocations[0][0];

  console.log("sorted allocation amounts: ", JSON.stringify(sortedAllocations, null, 2));
  console.log("chosen allocation amounts: ", allocationAmounts);
  console.log("silo addresses: ", allocatedPools);

  await run(
    acct,
    requestUuid,
    minerUid,
    debtAllocator.address,
    allocatedPools,
    allocationAmounts,
    { gasLimit: 3000000 }
  );
}

async function main() {
  runAllocator();
  setInterval(runAllocator, 86400000); // Run every 24 hours
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
