import { expect } from "chai";
import { BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { deriveSponsorWalletAddress } from "@api3/airnode-admin";

describe("YearnAirnodeAllocator", function () {
    it("should log MadeRequest event", async function () {
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
        const allocator = await YearnAirnodeAllocator.deploy(process.env.AIRNODE_RRP || "", process.env.AIRNODE_ADDRESS || "", sponsorWalletAddress);
        await allocator.deployed();
        console.log(`allocator deployed at: ${allocator.address}`)

        const allocateTx = await allocator
            .connect(acct)
            .requestAllocation(
                "4070000000000000000000000",
                "0x028ec7330ff87667b6dfb0d94b954c820195336c",
                [
                    { poolType: "1", contractAddress: "0x83F20F44975D03b1b09e64809B757c47f942BEeA" },
                    { poolType: "1", contractAddress: "0x018008bfb33d285247A21d44E50697654f754e63" },
                    { poolType: "1", contractAddress: "0x4DEDf26112B3Ec8eC46e7E31EA5e123490B05B8B" },
                ]
            );

        // console.log(allocateTx);

        expect(allocateTx)
            .to.emit(process.env.AIRNODE_RRP, "MadeFullRequest")
    });
});
