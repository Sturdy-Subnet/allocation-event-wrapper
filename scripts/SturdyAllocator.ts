// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import { BigNumberish, Overrides, Signer } from "ethers";
import dotenv from "dotenv";
dotenv.config();

export async function run(
  acct: Signer,
  allocationUid: string,
  minerUid: BigNumberish,
  userAddress: string,
  debtManagerAddress: string,
  allocatedPools: string[],
  allocationAmounts: BigNumberish[],
  overrides: Overrides
) {
  const allocator = await ethers.getContractAt(
    "SturdyAllocator",
    process.env.STURDY_ALLOCATOR || ""
  );

  const allocateTx = await allocator
    .connect(acct)
    .allocate(
      ethers.utils.toUtf8Bytes(allocationUid),
      minerUid,
      ethers.utils.getAddress(userAddress),
      ethers.utils.getAddress(debtManagerAddress),
      allocatedPools,
      allocationAmounts,
      overrides
    );

  console.log(allocateTx);
}
