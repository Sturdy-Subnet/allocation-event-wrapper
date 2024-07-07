// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import { BigNumberish, Signer } from "ethers";
import dotenv from "dotenv";
dotenv.config();

export async function run(
  acct: Signer,
  userAddress: string,
  allocatedPools: string[],
  allocationAmounts: BigNumberish[]
) {
  const allocator = await ethers.getContractAt(
    "SturdyAllocator",
    process.env.STURDY_ALLOCATOR || ""
  );

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
