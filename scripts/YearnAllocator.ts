// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import { BigNumberish, Overrides, Signer } from "ethers";
import dotenv from "dotenv";
import { YearnAllocator } from "../typechain";
dotenv.config();

export async function run(
  acct: Signer,
  allocationUid: string,
  minerUid: BigNumberish,
  debtAllocatorAddress: string,
  allocatedPools: string[],
  allocationAmounts: BigNumberish[],
  overrides: Overrides
) {
  const allocator: YearnAllocator = await ethers.getContractAt(
    "YearnAllocator",
    process.env.YEARN_ALLOCATOR || ""
  ) as YearnAllocator;

  const allocateTx = await allocator
    .connect(acct)
    .allocate(
      ethers.utils.toUtf8Bytes(allocationUid),
      minerUid,
      ethers.utils.getAddress(debtAllocatorAddress),
      allocatedPools,
      allocationAmounts,
      overrides
    );

  console.log("sent transaction!:")
  console.log(allocateTx);
}
