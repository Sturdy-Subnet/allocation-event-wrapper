import { expect } from "chai";
import { ethers } from "hardhat";
import { deriveSponsorWalletAddress } from "@api3/airnode-admin";
import { IAirnodeRrpV0, YearnAirnodeAllocator} from "../typechain";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
// import { BytesLike } from "ethers";

describe("YearnAirnodeAllocator", function () {
  let allocator: YearnAirnodeAllocator;
  let sponsorAddress: string;
  var sponsorWalletAddress: string;
  let acct: HardhatEthersSigner;
  let airnodeRrp: IAirnodeRrpV0;

  beforeEach(async function () {
    acct = (await ethers.getSigners())[0];
    const YearnAirnodeAllocator = await ethers.getContractFactory(
      "YearnAirnodeAllocator"
    );

    console.log("acct: " + acct.address);
    const txCount = await acct.getNonce();
    // the sponsor address IS the allocator's contract address;
    sponsorAddress = ethers.getCreateAddress({
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
    await allocator.waitForDeployment();
    console.log(`allocator deployed at: ${await allocator.getAddress()}`);

    airnodeRrp = (await ethers.getContractAt(
      "IAirnodeRrpV0",
      process.env.AIRNODE_RRP || ""
    ));
  });

  it("should allow withdrawals", async function () {
    // send some ether to the sponsor wallet address
    await acct.sendTransaction({
      to: sponsorWalletAddress,
      value: ethers.parseEther("1"),
      gasLimit: 300000,
    });

    const beforeBalance = await ethers.provider.getBalance(
      sponsorWalletAddress
    );
    expect(beforeBalance).to.equal(ethers.parseUnits("1", "ether"));

    let withdrawalRequestId: string = "";

    // var withdrawalRequestId: string = "test";
    // TODO: get withdrawal request ID from events
    // airnodeRrp.on("RequestedWithdrawal", (_a, _b, requestId, _c) => {
    //   console.log("requestId:");
    //   console.log(requestId);
    //   withdrawalRequestId = requestId;
    // });

    const withdrawRequest = await allocator
      .connect(acct)
      .withdraw(process.env.AIRNODE_ADDRESS || "", sponsorWalletAddress) as any;
    
    await withdrawRequest.wait();
    await ethers.provider.send("evm_mine", []);

    // TODO: check specific params
    expect(withdrawRequest).to.emit(allocator.getAddress(), "RequestedWithdrawal");
    // await withdrawRequest.wait();

    const filter = airnodeRrp.filters.RequestedWithdrawal();
    const events = await airnodeRrp.queryFilter(filter, withdrawRequest.blockNumber);
    if (events.length > 0) {
      const requestId = events[0].args[2];
      console.log("requestId:", requestId);
      withdrawalRequestId = requestId;
    } else {
      console.log("Event not emitted");
    }

    await ethers.provider.send("hardhat_impersonateAccount", [
      sponsorWalletAddress,
    ]);
    const sponsorWallet = await ethers.provider.getSigner(sponsorWalletAddress);

    console.log(`withdrawalRequestId: ${withdrawalRequestId}`);

    await airnodeRrp
      .connect(sponsorWallet)
      .fulfillWithdrawal(
        withdrawalRequestId,
        process.env.AIRNODE_ADDRESS || "",
        await allocator.getAddress(),
        {
          value: ethers.parseEther("0.9"),
        }
      );

    const afterBalance = await ethers.provider.getBalance(sponsorWalletAddress);

    expect(afterBalance).to.lte(ethers.parseEther("0.1"));
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

    await expect(allocateTx).to.emit(airnodeRrp, "MadeFullRequest");
  });

  it("should fulfill allocation request", async function () {
    let fulfillRequestId: string = "";

    // Attach listener before transaction is sent
    airnodeRrp.once("MadeFullRequest", (_a: any, requestId: string, ..._args: any[]) => {
        console.log("Event caught: requestId =", requestId);
        // fulfillRequestId = requestId;
    });

    // Impersonate sponsor wallet to fulfill request
    await ethers.provider.send("hardhat_impersonateAccount", [
      sponsorWalletAddress,
    ]);

    const sponsorWallet = await ethers.provider.getSigner(sponsorWalletAddress);

    await ethers.provider.send("hardhat_setBalance", [
      sponsorWalletAddress,
      ethers.toBeHex(ethers.parseUnits("10", "ether")),  // Convert 10 ETH to hex format
    ]);

    // Send the allocation transaction
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
      ) as any;

    // Wait for the transaction to be mined
    await allocateTx.wait();
    await ethers.provider.send("evm_mine", []);

    // Ensure the event was emitted as expected
    await expect(allocateTx).to.emit(airnodeRrp, "MadeFullRequest");

    const filter = airnodeRrp.filters.MadeFullRequest();
    const events = await airnodeRrp.queryFilter(filter, allocateTx.blockNumber);
    if (events.length > 0) {
      const requestId = events[0].args[1];
      console.log("requestId:", requestId);
      fulfillRequestId = requestId;
    } else {
      console.log("Event not emitted");
    }

    // Emulate Airnode fulfilling the request
    // NOTE: can't do this without private key - so it's a no go
    // const selector = ethers.id("fulfillAllocationRequest(bytes32,bytes)");
    // const fulfillData = ethers.ZeroHash;
    // const signature = await ethers.provider.send("eth_sign", [
    //   sponsorWalletAddress,
    //   ethers.solidityPacked(["bytes32", "bytes"], [fulfillRequestId, fulfillData]),
    // ]);

    // await airnodeRrp.connect(sponsorWallet).fulfill(fulfillRequestId, await airnodeRrp.getAddress(), await allocator.getAddress(), selector, fulfillData, signature);
    // await expect(allocateTx).to.emit(airnodeRrp, "FulfilledRequest");
  });


  // it("should perform allocations")

});
