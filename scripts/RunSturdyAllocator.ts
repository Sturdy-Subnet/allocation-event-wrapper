// eslint-disable-next-line node/no-missing-import
import { run } from "./SturdyAllocator";
import { ethers } from "hardhat";
import axios from "axios";
import dotenv from "dotenv";
import { BigNumberish } from "ethers";
import { request } from "http";
import { Allocation, Pools, RequestData, SturdySubnetResponse } from "./AllocatorTypes";
import { IVault } from "../typechain";

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
  const aggregator = await ethers.getContractAt("contracts/DebtManager.sol:IVault", aggregatorAddress);

  // obtain parameters needed for sturdy subnet allocation request
  const totalAssets = await aggregator.connect(acct).totalAssets();
  // obtain the different silos the aggregator is responsible for
  const siloAddresses = await debtManager.connect(acct).getStrategies();
  const pools: Pools = await (async () => {
    const entries = await Promise.all(siloAddresses.map(async contractAddress => {
      const silo: IVault = await ethers.getContractAt("contracts/interfaces/IVault.sol:IERC4626", contractAddress) as IVault;
      const pool_name = await silo.connect(acct).name();
      const entry = {
        "pool_model_disc": "CHAIN",
        "pool_type": "STURDY_SILO",
        "pool_id": pool_name,
        "contract_address": contractAddress,
      };
      return [pool_name, entry];
    }));
    return Object.fromEntries(entries);
  })()

  // this request will be sent to the sturdy subnet validator API
  const requestData: RequestData = {
    "request_type": "ORGANIC",
    "user_address": aggregatorAddress,
    "assets_and_pools": {
      "total_assets": totalAssets.toLocaleString(),
      "pools": pools
    }
  };

  console.log(`sending data`)
  console.log(JSON.stringify(requestData, null, 2))

  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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

  const receivedAllocs: SturdySubnetResponse = await sendAllocationRequest();
  const poolKeys = Object.keys(receivedAllocs.allocations);

  const allocs: SturdySubnetResponse = {
    request_uuid: receivedAllocs.request_uuid,
    allocations: Object.keys(requestData.assets_and_pools.pools).map(
      (poolUid) => {
        const retAllocs: Allocation = {
          uid: 69420,
          apy: 0.0,
          allocations: Object.keys(requestData.assets_and_pools.pools).map(
            function(allocPoolId: string): [string, number] {
              if (!(allocPoolId in poolKeys)){
                const retAlloc = 0.0;
                return [allocPoolId, retAlloc];
              }
              return [allocPoolId, receivedAllocs.allocations[minerUid].allocations[allocPoolId]];
            }
          ).reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {} as { [key: string]: number })
        }

        return {[minerUid]: retAllocs};
      }
    )
  }

  const requestUuid: string = allocs.request_uuid;

  console.log("allocations:", JSON.stringify(allocs));
  console.log("request uuid:", requestUuid);

  const sortedAllocations: [BigNumberish, Allocation][] = Object.entries(
    allocs.allocations
  )
    .map(([uid, data]) => {
      data.uid = uid;
      const ret: [BigNumberish, Allocation] = [uid, data];
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
    const minerUid = parseInt(sortedAllocations[0][1].uid);
  
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
