// eslint-disable-next-line node/no-missing-import
import { run } from "./SturdyAllocator";
import { ethers } from "hardhat";
import axios, { all } from "axios";
import dotenv from "dotenv";
import { BigNumberish } from "ethers";
import { MinerAllocation, Pools, RequestData, SturdySubnetResponse } from "./AllocatorTypes";
import { IVault } from "../typechain";
import { DebtManager } from "../typechain-types";

async function runAllocator() {
  console.log("attempting to rebalance vault...")
  dotenv.config();

  const apiKey = process.env.STURDY_VALI_API_KEY || ""; // Validator API Key
  const url = process.env.HOST_URL || ""; // endpoint url containing validator domain and endpoint for allocations (usually /allocate)

  const acct = (await ethers.getSigners())[0]

  const debtManager = await ethers.getContractAt(
    "DebtManager",
    process.env.STURDY_DEBT_MANAGER || ""
  );

  // connect to aggregator
  const aggregatorAddress = await debtManager.connect(acct).vault();
  const aggregator: IVault = await ethers.getContractAt("contracts/DebtManager.sol:IVault", aggregatorAddress) as unknown as IVault;

  // obtain parameters needed for sturdy subnet allocation request
  const totalAssets = await aggregator.connect(acct).totalAssets();
  console.log(`total assets: ${totalAssets}`);
  // obtain the different silos the aggregator is responsible for
  const siloAddresses = await debtManager.connect(acct).getStrategies();
  const pools: Pools = await (async () => {
    const entries = await Promise.all(siloAddresses.map(async contractAddress => {
      // const silo: IVault = await ethers.getContractAt("contracts/interfaces/IVault.sol:IERC4626", contractAddress) as unknown as IVault;
      const entry = {
        "pool_model_disc": "CHAIN",
        "pool_type": 1,
        "contract_address": contractAddress,
      };
      return [contractAddress, entry];
    }));
    return Object.fromEntries(entries);
  })()

  // this request will be sent to the sturdy subnet validator API
  const requestData: RequestData = {
    "request_type": "ORGANIC",
    "user_address": aggregatorAddress,
    "assets_and_pools": {
      "total_assets": totalAssets.toString(),
      "pools": pools
    }
  };

  console.log(`sending data`)
  console.log(JSON.stringify(requestData, null, 2))

  const config = {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
  };

  const sendAllocationRequest = async () => {
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
        function (allocContractAddr: string) {
          if (!(poolAddresses.includes(allocContractAddr))) {
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
  const allocatedPools: string[] = poolUids.map((uid) => ethers.getAddress(requestData.assets_and_pools.pools[uid].contract_address));
  const allocationAmounts: BigNumberish[] = Object.values(
    sortedAllocations[0][1].allocations
  ).map((amount) =>
    ethers.toBigInt(
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
    userAddress,
    process.env.STURDY_DEBT_MANAGER || "",
    allocatedPools,
    allocationAmounts,
    { gasLimit: 3000000 }
  );
}

async function main() {
  runAllocator()
  setInterval(runAllocator, 86400000) // Run every 24 hours
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
