import { expect } from "chai";
import { ethers } from "hardhat";
import { deriveSponsorWalletAddress } from "@api3/airnode-admin";
import { IAirnodeRrpV0, IDebtAllocator, IDebtAllocatorFactory, IVault, YearnAirnodeAllocator } from "../typechain";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { impersonateAccount } from "@nomicfoundation/hardhat-network-helpers";
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

    await impersonateAccount(sponsorWalletAddress);
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
        "4732267826468720928467714",
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
    const allocatorAddress = await allocator.getAddress();

    // Impersonate sponsor wallet to fulfill request
    const airnodeRrpAddress = await airnodeRrp.getAddress();
    await impersonateAccount(airnodeRrpAddress);
    const airnodeRrpWallet = await ethers.provider.getSigner(airnodeRrpAddress);

    await ethers.provider.send("hardhat_setBalance", [
      sponsorWalletAddress,
      ethers.toBeHex(ethers.parseUnits("10", "ether")),  // Convert 10 ETH to hex format
    ]);

    await ethers.provider.send("hardhat_setBalance", [
      airnodeRrpAddress,
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
      fulfillRequestId = requestId;
      console.log("fulfillRequestId:", fulfillRequestId);
    } else {
      console.log("Event not emitted");
    }

    // Impersonate admin of debt allocator
    await impersonateAccount(process.env.YEARN_DEBT_MANAGER || "");

    await ethers.provider.send("hardhat_setBalance", [
      process.env.YEARN_DEBT_MANAGER,
      ethers.toBeHex(ethers.parseUnits("10", "ether")),  // Convert 10 ETH to hex format
    ]);

    const owner_acct = await ethers.provider.getSigner(process.env.YEARN_DEBT_MANAGER); // Here we impersonate the debt manager owner to set perms

    // Set allocator as keeper
    const debtAllocator: IDebtAllocator = await ethers.getContractAt(
      "IDebtAllocator",
      process.env.YEARN_DEBT_ALLOCATOR || ""
    ) as IDebtAllocator;

    const debtAllocatorFactory: IDebtAllocatorFactory = await ethers.getContractAt(
      "IDebtAllocatorFactory",
      process.env.YEARN_DEBT_ALLOCATOR_FACTORY || ""
    ) as IDebtAllocatorFactory;

    // set manager of the debt allocator to be the deployed allocation contract
    await debtAllocator.connect(owner_acct).setManager(allocatorAddress, true);
    // set keeper of the debt allocator to be the deployed allocation contract
    await debtAllocatorFactory.connect(owner_acct).setKeeper(allocatorAddress, true, { gasLimit: 300000 });

    // Emulate Airnode fulfilling the request
    // encoded allocations returned from the airnode, from Sturdy Subnet
    const encodedAllocations = "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001803634343664393236643138383439643039616137393930643030633931666463000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000300000000000000000000000083f20f44975d03b1b09e64809b757c47f942beea000000000000000000000000018008bfb33d285247a21d44e50697654f754e630000000000000000000000004dedf26112b3ec8ec46e7e31ea5e123490b05b8b000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000002097f5e748558e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001cb6c5f82707f30000000";
    const allocationsBytes = "0x3634343664393236643138383439643039616137393930643030633931666463000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000300000000000000000000000083f20f44975d03b1b09e64809b757c47f942beea000000000000000000000000018008bfb33d285247a21d44e50697654f754e630000000000000000000000004dedf26112b3ec8ec46e7e31ea5e123490b05b8b000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000002097f5e748558e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001cb6c5f82707f30000000"
    await allocator.connect(airnodeRrpWallet).fulfillAllocationRequest(fulfillRequestId, encodedAllocations);
    const currentResponse = await allocator.currentResponseData();
    expect(currentResponse).to.equal(allocationsBytes);

    // apply allocations through the yearn dai vaults' debt manager
    await allocator.connect(acct).applyAllocations("0xc46D9286Cf830cC2e602e6D5F005455dF9961b4A");

    // check new vault debts
    const vaultAddr = await debtAllocator.vault();
    const vault: IVault = await ethers.getContractAt("contracts/interfaces/IVault.sol:IVault", vaultAddr) as unknown as IVault;
    const strats = await vault.get_default_queue();

    const expectedDebts = ["2462702480283999894765568", "0", "417002194480939035214661"]
    const currentDebts = [];
    for (const strat of strats) {
      const params = await vault.strategies(strat);
      currentDebts.push(params.current_debt.toString());
    }

    expect(currentDebts).to.eql(expectedDebts);

  }).timeout(120000);


  // it("should perform allocations")

});
