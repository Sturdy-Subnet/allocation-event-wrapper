// eslint-disable-next-line node/no-missing-import
import { run } from "./SturdyAllocator";
import { ethers } from "hardhat";
import axios from "axios";
import dotenv from "dotenv";
import { BigNumberish } from "ethers";

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

async function test() {
  dotenv.config();

  const apiKey = process.env.STURDY_VALI_API_KEY || ""; // Validator API Key
  const url = process.env.HOST_URL || ""; // endpoint url containing validator domain and endpoint for allocations (usually /allocate)

  await ethers.provider.send("hardhat_impersonateAccount", [
    process.env.DEBT_MANAGER_OWNER || "",
  ]);

  const acct = ethers.provider.getSigner(process.env.DEBT_MANAGER_OWNER || ""); // Here we impersonate the debt manager owner to set perms

  // this request will be sent to the sturdy subnet validator API
  const data = {
    "request_type": "ORGANIC",
    "user_address": "0xD8f9475A4A1A6812212FD62e80413d496038A89A",
    "assets_and_pools": {
      "total_assets": 1000000000000000000,
      "pools": {
        "Sturdy ETH/rsETH silo": {
          "pool_model_disc": "CHAIN",
          "pool_type": "STURDY_SILO",
          "pool_id": "Sturdy ETH/rsETH silo",
          "contract_address": "0xe53FFd56FaDC7030156069aE1b34dE0Ab8b703F4"
        },
        "Sturdy ETH/rswETH Pendle PT silo": {
          "pool_model_disc": "CHAIN",
          "pool_type": "STURDY_SILO",
          "pool_id": "Sturdy ETH/rswETH Pendle PT silo",
          "contract_address": "0xC8D4a8a7F593e73cD32cD6C5Fb11fE20F23f9695"
        },
        "Sturdy ETH/SwETH silo": {
          "pool_model_disc": "CHAIN",
          "pool_type": "STURDY_SILO",
          "pool_id": "Sturdy ETH/SwETH silo",
          "contract_address": "0xD002Dc1c05fd7FF28C55eEA3dDcB9051B2B81bD2"
        },
        "Sturdy ETH/Sommelier Turbo stETH silo": {
          "pool_model_disc": "CHAIN",
          "pool_type": "STURDY_SILO",
          "pool_id": "Sturdy ETH/Sommelier Turbo stETH silo",
          "contract_address": "0x0DD49C449C788285F50B529145D6e6E76f02Fd8f"
        }
      }
    }
  };

  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  };

  const sendAllocationRequest = async () => {
    try {
      const response = await axios.post(url, data, config);
      const responseData: SturdySubnetResponse = response.data;
      console.log("Response:", responseData);
      return responseData;
    } catch (error) {
      console.error("Error:", error);
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
    data.assets_and_pools.pools
  ).map((pool) => ethers.utils.getAddress(pool.contract_address));
  const allocationAmounts: BigNumberish[] = Object.values(
    sortedAllocations[0][1].allocations
  ).map((amount) =>
    ethers.BigNumber.from(
      Number(amount).toLocaleString("fullwide", { useGrouping: false })
    )
  );
  const userAddress = data.user_address;
  const minerUid = parseInt(sortedAllocations[0][1].uid);

  console.log("sorted allocations: ", allocationAmounts);
  console.log("silo addresses: ", allocatedPools);
  console.log("debt manager: ", process.env.DEBT_MANAGER);

  // set manual allocator of debt manager
  const debtManager = await ethers.getContractAt(
    "DebtManager",
    process.env.DEBT_MANAGER || ""
  );

  await debtManager
    .connect(acct)
    .setManualAllocator(process.env.STURDY_ALLOCATOR || "");

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

test().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
