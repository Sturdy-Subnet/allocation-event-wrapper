import { expect } from "chai";
import { BigNumberish } from "ethers";
import { ethers } from "hardhat";

const allocationRequest  = {
  "request_type": "ORGANIC",
  "user_address": "0xD8f9475A4A1A6812212FD62e80413d496038A89A",
  "assets_and_pools": {
    "total_assets": 4070000000000000000000,
    "pools": {
      "Sturdy ETH/rsETH silo": {
        "pool_model_disc": "CHAIN",
        "pool_type": "STURDY_SILO",
        "pool_id": "Sturdy ETH/rsETH silo",
        "contract_address": "0xe53FFd56FaDC7030156069aE1b34dE0Ab8b703F4"
      },
      "Sturdy ETH/rswETH Pendle PT silo": {
        "pool_model_disc": "CHAIN",
        "pool_type": "STURDY_SILO",
        "pool_id": "Sturdy ETH/rswETH Pendle PT silo",
        "contract_address": "0xC8D4a8a7F593e73cD32cD6C5Fb11fE20F23f9695"
      },
      "Sturdy ETH/SwETH silo": {
        "pool_model_disc": "CHAIN",
        "pool_type": "STURDY_SILO",
        "pool_id": "Sturdy ETH/SwETH silo",
        "contract_address": "0xD002Dc1c05fd7FF28C55eEA3dDcB9051B2B81bD2"
      },
      "Sturdy ETH/Sommelier Turbo stETH silo": {
        "pool_model_disc": "CHAIN",
        "pool_type": "STURDY_SILO",
        "pool_id": "Sturdy ETH/Sommelier Turbo stETH silo",
        "contract_address": "0x0DD49C449C788285F50B529145D6e6E76f02Fd8f"
      }
    }
  }
};

const allocations = {
  "Sturdy ETH /rsETH silo": "1017500000000000000000",
  "Sturdy ETH/rswETH Pendle PT silo": "1017500000000000000000",
  "Sturdy ETH/SwETH silo": "1017500000000000000000",
  "Sturdy ETH/Sommelier Turbo stETH silo": "1017500000000000000000",
};

describe("AllocationLogger", function () {
  it("Should log allocation event", async function () {
    const acct = (await ethers.getSigners())[0];
    const MockAllocator = await ethers.getContractFactory("MockAllocator");
    const allocator = await MockAllocator.deploy();
    await allocator.deployed();

    const allocatedPools: string[] = Object.values(
      allocationRequest.assets_and_pools.pools
    ).map((pool) => pool.contract_address);
    const allocationAmounts: BigNumberish[] = Object.values(allocations);
    const userAddress = allocationRequest.user_address;

    const allocateTx = await allocator
      .connect(acct)
      .allocate(
        ethers.utils.toUtf8Bytes("37fc2429b51e4a7785cb581b43beebba"),
        69,
        ethers.utils.getAddress(userAddress),
        allocatedPools,
        allocationAmounts
      );

    // wait until the transaction is mined
    expect(allocateTx)
      .to.emit(allocator, "AllocationEvent")
      .withArgs(ethers.utils.toUtf8Bytes("37fc2429b51e4a7785cb581b43beebba"), 69, allocatedPools, allocationAmounts);
  });
});
