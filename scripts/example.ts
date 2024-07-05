// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import axios from "axios";
import dotenv from "dotenv";
import { BigNumberish } from "ethers";

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
  dotenv.config();
  // const allocateHost = process.env.ALLOCATE_HOST;
  const apiKey = process.env.STURDY_VALI_API_KEY;
  const url = `http://127.0.0.1:9040/allocate`;

  const data = {
    request_type: 0,
    user_address: "0xD8f9475A4A1A6812212FD62e80413d496038A89A",
    assets_and_pools: {
      total_assets: 1000000000000000000,
      pools: {
        "Sturdy ETH/rsETH silo": {
          pool_type: 2,
          pool_id: "Sturdy ETH/rsETH silo",
          contract_address: "0xe53FFd56FaDC7030156069aE1b34dE0Ab8b703F4",
        },
        "Sturdy ETH/rswETH Pendle PT silo": {
          pool_type: 2,
          pool_id: "Sturdy ETH/rswETH Pendle PT silo",
          contract_address: "0xC8D4a8a7F593e73cD32cD6C5Fb11fE20F23f9695",
        },
        "Sturdy ETH/SwETH silo": {
          pool_type: 2,
          pool_id: "Sturdy ETH/SwETH silo",
          contract_address: "0xD002Dc1c05fd7FF28C55eEA3dDcB9051B2B81bD2",
        },
        "Sturdy ETH/Sommelier Turbo stETH silo": {
          pool_type: 2,
          pool_id: "Sturdy ETH/Sommelier Turbo stETH silo",
          contract_address: "0x0DD49C449C788285F50B529145D6e6E76f02Fd8f",
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

  const allocations = Object.values(allocs.allocations).map((poolData) =>
    Object.values(poolData.allocations).map((amount) => amount.toString())
  );

  console.log("allocations array: ", allocations);

  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

  const acct = (await ethers.getSigners())[0];
  const MockAllocator = await ethers.getContractFactory("MockAllocator");
  const allocator = await MockAllocator.deploy();
  await allocator.deployed();

  const allocatedPools: string[] = Object.values(
    data.assets_and_pools.pools
  ).map((pool) => pool.contract_address);
  const allocationAmounts: BigNumberish[] = Object.values(allocations[0]);
  const userAddress = data.user_address;

  const allocateTx = await allocator
    .connect(acct)
    .allocate(
      "test-alloc",
      69,
      ethers.utils.getAddress(userAddress),
      allocatedPools,
      allocationAmounts
    );

  console.log(allocateTx);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
