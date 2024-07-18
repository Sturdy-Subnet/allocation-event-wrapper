// eslint-disable-next-line node/no-missing-import
import { run } from "./SturdyAllocator";
import { ethers } from "hardhat";
import axios from "axios";
import dotenv from "dotenv";
import { BigNumberish, Signer } from "ethers";

interface Allocation extends Object {
  uid: string;
  apy: number;
  allocations: { [key: string]: number }; // Assuming the allocations object is a dictionary with number values
}

interface SturdySubnetResponse extends Object {
  // eslint-disable-next-line camelcase
  request_uuid: string;
  allocations: {
    [key: string]: Allocation;
  };
}

async function update() {
  dotenv.config();

  const apiKey = process.env.STURDY_VALI_API_KEY || ""; // Validator API Key
  const url = process.env.HOST_URL || ""; // endpoint url containing validator domain and endpoint for allocations (usually /allocate)

  const acct = (await ethers.getSigners())[0] as Signer
  var owner_acct = acct

  const network = await ethers.provider.getNetwork()
  if (network.chainId == 31337) {
    await ethers.provider.send("hardhat_impersonateAccount", [
      process.env.DEBT_MANAGER_OWNER || "",
    ]);

    owner_acct = ethers.provider.getSigner(process.env.DEBT_MANAGER_OWNER || ""); // Here we impersonate the debt manager owner to set perms
  }

  // set manual allocator of debt manager
  const debtManager = await ethers.getContractAt(
    "DebtManager",
    process.env.DEBT_MANAGER || ""
  );

  await debtManager
    .connect(owner_acct)
    .setManualAllocator(process.env.STURDY_ALLOCATOR || "");

}

update().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
