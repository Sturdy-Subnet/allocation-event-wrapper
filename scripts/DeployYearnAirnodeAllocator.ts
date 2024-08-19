// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { deriveSponsorWalletAddress } from "@api3/airnode-admin";
import { ethers } from "hardhat";

async function main() {
  const acct = (await ethers.getSigners())[0];
  const YearnAirnodeAllocator = await ethers.getContractFactory("YearnAirnodeAllocator");
  const txCount = await acct.getTransactionCount();
  // the sponsor address IS the allocator's contract address;
  const sponsorAddress: string = ethers.utils.getContractAddress({
    from: acct.address,
    nonce: txCount
  })
  console.log(`sponsorAddress: ${sponsorAddress}`);

  const sponsorWalletAddress = deriveSponsorWalletAddress(process.env.AIRNODE_XPUB || "", process.env.AIRNODE_ADDRESS || "", sponsorAddress);
  console.log(`sponsorWalletAddress: ${sponsorWalletAddress}`);
  const allocator = await YearnAirnodeAllocator.deploy(process.env.AIRNODE_RRP || "", "0x3ddA027949EB6fb77eeB78cd6E6D11C466f075d7", sponsorWalletAddress);
  await allocator.deployed();
  console.log(`allocator deployed at: ${allocator.address}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
