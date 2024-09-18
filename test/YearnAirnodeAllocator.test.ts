import { expect } from "chai";
import { ethers } from "hardhat";
import { deriveSponsorWalletAddress } from "@api3/airnode-admin";
import { YearnAirnodeAllocator } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { AirnodeRrpV0 } from "@api3/airnode-protocol";
// import { BytesLike } from "ethers";

describe("YearnAirnodeAllocator", function () {
  let allocator: YearnAirnodeAllocator;
  let sponsorAddress: string;
  let sponsorWalletAddress: string;
  let acct: SignerWithAddress;
  let airnodeRrp: AirnodeRrpV0;

  beforeEach(async function () {
    acct = (await ethers.getSigners())[0];
    const YearnAirnodeAllocator = await ethers.getContractFactory(
      "YearnAirnodeAllocator"
    );
    const txCount = await acct.getTransactionCount();
    // the sponsor address IS the allocator's contract address;
    sponsorAddress = ethers.utils.getContractAddress({
      from: acct.address,
      nonce: txCount,
    });
    console.log(`sponsorAddress: ${sponsorAddress}`);

    sponsorWalletAddress = deriveSponsorWalletAddress(
      process.env.AIRNODE_XPUB || "",
      process.env.AIRNODE_ADDRESS || "",
      sponsorAddress
    );

    console.log(`sponsorWalletAddress: ${sponsorWalletAddress}`);
    allocator = (await YearnAirnodeAllocator.deploy(
      process.env.AIRNODE_RRP || "",
      process.env.AIRNODE_ADDRESS || "",
      sponsorWalletAddress
    )) as YearnAirnodeAllocator;
    await allocator.deployed();
    console.log(`allocator deployed at: ${allocator.address}`);

    airnodeRrp = (await ethers.getContractAt(
      "IAirnodeRrpV0",
      process.env.AIRNODE_RRP || ""
    )) as AirnodeRrpV0;
  });

  it("should allow withdrawals", async function () {
    // send some ether to the sponsor wallet address
    await acct.sendTransaction({
      to: sponsorWalletAddress,
      value: ethers.utils.parseEther("1"),
      gasLimit: 300000,
    });

    const beforeBalance = await ethers.provider.getBalance(
      sponsorWalletAddress
    );
    expect(beforeBalance).to.equal(ethers.utils.parseUnits("1", "ether"));

    const withdrawalRequestId =
      "0xff4759361984d6f0730635e7808af2a12b15ea67cf4a385f6f6064b46996a782";
    // var withdrawalRequestId: string = "test";
    // TODO: get withdrawal request ID from events
    // airnodeRrp.on("RequestedWithdrawal", (_a, _b, requestId, _c) => {
    //   console.log("requestId:");
    //   console.log(requestId);
    //   withdrawalRequestId = requestId;
    // });

    const withdrawRequest = await allocator
      .connect(acct)
      .withdraw(process.env.AIRNODE_ADDRESS || "", sponsorWalletAddress);
    // TODO: check specific params
    expect(withdrawRequest).to.emit(allocator.address, "RequestedWithdrawal");
    await withdrawRequest.wait();

    await ethers.provider.send("hardhat_impersonateAccount", [
      sponsorWalletAddress,
    ]);
    const sponsorWallet = ethers.provider.getSigner(sponsorWalletAddress);

    console.log(`withdrawalRequestId: ${withdrawalRequestId}`);

    await airnodeRrp
      .connect(sponsorWallet)
      .fulfillWithdrawal(
        withdrawalRequestId,
        process.env.AIRNODE_ADDRESS || "",
        allocator.address,
        {
          value: ethers.utils.parseEther("0.9"),
        }
      );

    const afterBalance = await ethers.provider.getBalance(sponsorWalletAddress);

    expect(afterBalance).to.lte(ethers.utils.parseEther("0.1"));
  });

  it("should log MadeRequest event", async function () {
    const allocateTx = await allocator
      .connect(acct)
      .requestAllocation(
        "4070000000000000000000000",
        "0x028ec7330ff87667b6dfb0d94b954c820195336c",
        [
          {
            poolType: "3",
            contractAddress: "0x83F20F44975D03b1b09e64809B757c47f942BEeA",
          },
          {
            poolType: "2",
            contractAddress: "0x018008bfb33d285247A21d44E50697654f754e63",
          },
          {
            poolType: "2",
            contractAddress: "0x4DEDf26112B3Ec8eC46e7E31EA5e123490B05B8B",
          },
        ]
      );

    // console.log(allocateTx);

    expect(allocateTx).to.emit(process.env.AIRNODE_RRP, "MadeFullRequest");
  });

  // it("should fulfill allocation request", async function () {
  //   const allocateTx = await allocator
  //     .connect(acct)
  //     .requestAllocation(
  //       "4070000000000000000000000",
  //       "0x028ec7330ff87667b6dfb0d94b954c820195336c",
  //       [
  //         {
  //           poolType: "3",
  //           contractAddress: "0x83F20F44975D03b1b09e64809B757c47f942BEeA",
  //         },
  //         {
  //           poolType: "2",
  //           contractAddress: "0x018008bfb33d285247A21d44E50697654f754e63",
  //         },
  //         {
  //           poolType: "2",
  //           contractAddress: "0x4DEDf26112B3Ec8eC46e7E31EA5e123490B05B8B",
  //         },
  //       ]
  //     );

  //   expect(allocateTx).to.emit(process.env.AIRNODE_RRP, "MadeFullRequest");

  //   await ethers.provider.send("hardhat_impersonateAccount", [
  //     sponsorWalletAddress,
  //   ]);

  //   const sponsorWallet = ethers.provider.getSigner(sponsorWalletAddress);

  //   await airnodeRrp.connect(sponsorWallet).fulfill()

  // });
});
