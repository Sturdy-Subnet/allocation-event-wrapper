// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import axios from "axios";
import dotenv from "dotenv";
import { BigNumberish, Signer } from "ethers";

interface Allocation extends Object {
  apy: number;
  allocations: { [key: string]: number }; // Assuming the allocations object is a dictionary with number values
}

interface Allocations extends Object {
  allocations: {
    [key: string]: Allocation;
  };
}

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    "http://127.0.0.1:8545"
  );

  await provider.send("hardhat_impersonateAccount", [
    process.env.DEBT_MANAGER_OWNER || "",
  ]);
  const acct = provider.getSigner(process.env.DEBT_MANAGER_OWNER || "");
  await run(acct);
}

export async function run(acct: Signer) {
  dotenv.config();
  const apiKey = process.env.STURDY_VALI_API_KEY || "";
  const url = process.env.HOST_URL || "";

  const data = {
    request_type: 0,
    user_address: "0xD8f9475A4A1A6812212FD62e80413d496038A89A",
    assets_and_pools: {
      total_assets: 1000000000000000000,
      pools: {
        "Sturdy Interest Bearing crvUSD": {
          pool_type: 2,
          pool_id: "Sturdy Interest Bearing crvUSD",
          contract_address: "0x6311fF24fb15310eD3d2180D3d0507A21a8e5227",
        },
        "Sturdy crvUSD/yean curve mkUSD-crvUSD LP silo": {
          pool_type: 2,
          pool_id: "Sturdy crvUSD/yean curve mkUSD-crvUSD LP silo",
          contract_address: "0x200723063111f9f8f1d44c0F30afAdf0C0b1a04b",
        },
        "Sturdy Curve USDT-crvUSD": {
          pool_type: 2,
          pool_id: "Sturdy Curve USDT-crvUSD",
          contract_address: "0x26fe402A57D52c8a323bb6e09f06489C8216aC88",
        },
        "Sturdy crvUSD/yean curve FRAX-crvUSD LP silo": {
          pool_type: 2,
          pool_id: "Sturdy crvUSD/yean curve FRAX-crvUSD LP silo",
          contract_address: "0x8dDE9A50a91cc0a5DaBdc5d3931c1AF60408c84D",
        },
      },
    },
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
      const responseData: Allocations = response.data;
      console.log("Response:", responseData);
      return responseData;
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  };

  const allocs: Allocations = await sendAllocationRequest();

  console.log("allocations:", JSON.stringify(allocs));

  const allocations = Object.values(allocs.allocations)
    .sort((a, b) => b.apy - a.apy) // Sort by APY in descending order
    .map((poolData) =>
      Object.values(poolData.allocations).map((amount) => amount.toString())
    );

  const allocator = await ethers.getContractAt(
    "SturdyAllocator",
    process.env.STURDY_ALLOCATOR || ""
  );

  const allocatedPools: string[] = Object.values(
    data.assets_and_pools.pools
  ).map((pool) => ethers.utils.getAddress(pool.contract_address));
  const allocationAmounts: BigNumberish[] = Object.values(allocations[0]);
  const userAddress = data.user_address;

  console.log("allocations array: ", allocations);
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

  const allocateTx = await allocator
    .connect(acct)
    .allocate(
      "saCrvUSD",
      69,
      ethers.utils.getAddress(userAddress),
      ethers.utils.getAddress(process.env.DEBT_MANAGER || ""),
      allocatedPools,
      allocationAmounts,
      { gasLimit: 3000000 }
    );

  console.log(allocateTx);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
