// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

async function main() {
  // const allocatorName: string = process.env.CONTRACT_NAME || ""

  const acct = (await ethers.getSigners())[0];
  const YearnAirnodeAllocator = await ethers.getContractFactory("YearnAirnodeAllocator");
  const allocator = await YearnAirnodeAllocator.connect(acct).deploy("0xa0AD79D995DdeeB18a14eAef56A549A04e3Aa1Bd", "0x3ddA027949EB6fb77eeB78cd6E6D11C466f075d7", { maxFeePerGas: 125791680190 });
  await allocator.deployed();

  console.log(`allocator deployed at:  ${allocator.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
