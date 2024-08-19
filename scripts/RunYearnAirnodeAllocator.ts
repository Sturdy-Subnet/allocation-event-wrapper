// eslint-disable-next-line node/no-missing-import
import { ethers } from "hardhat";
import dotenv from "dotenv";
import { Signer } from "ethers";
import { YearnAirnodeAllocator } from "../typechain";

async function update() {
  const acct = (await ethers.getSigners())[0] as Signer
  const allocator = await ethers.getContractAt("YearnAirnodeAllocator", process.env.YEARN_ALLOCATOR || "") as YearnAirnodeAllocator;
  const allocateTx = await allocator
    .connect(acct)
    .requestAllocation(
      "4070000000000000000000000",
      "0x028ec7330ff87667b6dfb0d94b954c820195336c",
      [
        { poolType: "3", contractAddress: "0x83F20F44975D03b1b09e64809B757c47f942BEeA" },
        { poolType: "2", contractAddress: "0x018008bfb33d285247A21d44E50697654f754e63" },
        { poolType: "2", contractAddress: "0x4DEDf26112B3Ec8eC46e7E31EA5e123490B05B8B" },
      ]
    );

  console.log(`allocateTx: ${JSON.stringify(allocateTx)}`);

}

update().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
