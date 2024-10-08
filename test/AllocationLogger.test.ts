import { expect } from "chai";
import { BigNumberish } from "ethers";
import { ethers } from "hardhat";

const allocationRequest = {
  "request_type": "ORGANIC",
  "user_address": "0xD8f9475A4A1A6812212FD62e80413d496038A89A",
  "assets_and_pools": {
    "total_assets": 4070000000000000000000,
    "pools": {
      "0xe53FFd56FaDC7030156069aE1b34dE0Ab8b703F4": {
        "pool_model_disc": "CHAIN",
        "pool_type": "STURDY_SILO",
        "contract_address": "0xe53FFd56FaDC7030156069aE1b34dE0Ab8b703F4"
      },
      "0xC8D4a8a7F593e73cD32cD6C5Fb11fE20F23f9695": {
        "pool_model_disc": "CHAIN",
        "pool_type": "STURDY_SILO",
        "contract_address": "0xC8D4a8a7F593e73cD32cD6C5Fb11fE20F23f9695"
      },
      "0xD002Dc1c05fd7FF28C55eEA3dDcB9051B2B81bD2": {
        "pool_model_disc": "CHAIN",
        "pool_type": "STURDY_SILO",
        "contract_address": "0xD002Dc1c05fd7FF28C55eEA3dDcB9051B2B81bD2"
      },
      "0x0DD49C449C788285F50B529145D6e6E76f02Fd8f": {
        "pool_model_disc": "CHAIN",
        "pool_type": "STURDY_SILO",
        "contract_address": "0x0DD49C449C788285F50B529145D6e6E76f02Fd8f"
      }
    }
  }
};


const allocations = {
  "0xe53FFd56FaDC7030156069aE1b34dE0Ab8b703F4": "1017500000000000000000",
  "0xC8D4a8a7F593e73cD32cD6C5Fb11fE20F23f9695": "1017500000000000000000",
  "0xD002Dc1c05fd7FF28C55eEA3dDcB9051B2B81bD2": "1017500000000000000000",
  "0x0DD49C449C788285F50B529145D6e6E76f02Fd8f": "1017500000000000000000",
};

describe("AllocationLogger", function () {
  it("Should log allocation event", async function () {
    const acct = (await ethers.getSigners())[0];
    const MockAllocator = await ethers.getContractFactory("MockAllocator");
    const allocator = await MockAllocator.deploy();
    await allocator.waitForDeployment();

    const allocatedPools: string[] = Object.values(
      allocationRequest.assets_and_pools.pools
    ).map((pool) => pool.contract_address);
    const allocationAmounts: BigNumberish[] = Object.values(allocations);
    const userAddress = allocationRequest.user_address;

    const allocateTx = await allocator
      .connect(acct)
      .allocate(
        ethers.toUtf8Bytes("37fc2429b51e4a7785cb581b43beebba"),
        69,
        ethers.getAddress(userAddress),
        allocatedPools,
        allocationAmounts
      );

    // wait until the transaction is mined
    expect(allocateTx)
      .to.emit(allocator, "AllocationEvent")
      .withArgs(ethers.toUtf8Bytes("37fc2429b51e4a7785cb581b43beebba"), 69, allocatedPools, allocationAmounts);
  });
});
