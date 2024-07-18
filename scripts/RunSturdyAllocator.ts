// eslint-disable-next-line node/no-missing-import
import { run } from "./SturdyAllocator";
import { ethers } from "hardhat";
import axios from "axios";
import dotenv from "dotenv";
import { BigNumberish } from "ethers";
import { request } from "http";

interface Allocation extends Object {
  uid: string;
  apy: number;
  allocations: { [key: string]: number }; // Assuming the allocations object is a dictionary with number values
}

interface SturdySubnetResponse extends Object {
  // eslint-disable-next-line camelcase
  request_uuid: string;
  allocations: {
    [key: string]: Allocation;
  };
}

interface PoolEntry extends Object {
  pool_model_disc: string;
  pool_type: string;
  pool_id: string;
  contract_address: string;
}

interface Pools {
  [key: string]: PoolEntry;
}

interface RequestData extends Object {
  request_type: string;
  user_address: string;
  assets_and_pools: {
    total_assets: BigNumberish;
    pools: Pools;
  }
}



async function runAllocator() {
  console.log("attempting to rebalance vault...")
  dotenv.config();

  const apiKey = process.env.STURDY_VALI_API_KEY || ""; // Validator API Key
  const url = process.env.HOST_URL || ""; // endpoint url containing validator domain and endpoint for allocations (usually /allocate)

  const acct = (await ethers.getSigners())[0]

  const debtManager = await ethers.getContractAt(
    "DebtManager",
    process.env.DEBT_MANAGER || ""
  );

  // connect to aggregator
  const aggregatorAddress = await debtManager.connect(acct).vault();
  const aggregator = await ethers.getContractAt("contracts/DebtManager.sol:IVault", aggregatorAddress);

  // obtain parameters needed for sturdy subnet allocation request
  const totalDebt = await aggregator.connect(acct).totalDebt();
  // obtain the different silos the aggregator is responsible for
  const siloAddresses = await debtManager.connect(acct).getStrategies();
  const pools: Pools = await (async () => {
    const entries = await Promise.all(siloAddresses.map(async contract_address => {
      const silo = await ethers.getContractAt("IStrategy", contract_address);
      const pool_name = await silo.connect(acct).name();
      const entry = {
        "pool_model_disc": "CHAIN",
        "pool_type": "STURDY_SILO",
        "pool_id": pool_name,
        "contract_address": contract_address,
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
      "total_assets": totalDebt.toLocaleString(),
      "pools": pools
    }
  };

  console.log(`sending data`)
  console.log(requestData)

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

  const allocs: SturdySubnetResponse = await sendAllocationRequest();
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

  const allocatedPools: string[] = Object.values(
    requestData.assets_and_pools.pools
  ).map((pool) => ethers.utils.getAddress(pool.contract_address));
  const allocationAmounts: BigNumberish[] = Object.values(
    sortedAllocations[0][1].allocations
  ).map((amount) =>
    ethers.BigNumber.from(
      Number(amount).toLocaleString("fullwide", { useGrouping: false })
    )
  );
  const userAddress = requestData.user_address;
  const minerUid = parseInt(sortedAllocations[0][1].uid);

  console.log("sorted allocations: ", allocationAmounts);
  console.log("silo addresses: ", allocatedPools);

  await run(
    acct,
    requestUuid,
    minerUid,
    userAddress,
    process.env.DEBT_MANAGER || "",
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
