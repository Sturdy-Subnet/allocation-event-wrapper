// eslint-disable-next-line node/no-missing-import
import { ethers } from "hardhat";
import dotenv from "dotenv";
import { Signer } from "ethers";

async function update() {
  dotenv.config();
  
  const acct = (await ethers.getSigners())[0] as Signer
  var owner_acct = acct

  const network = await ethers.provider.getNetwork()
  if (network.chainId == ethers.toBigInt(31337)) {
    await ethers.provider.send("hardhat_impersonateAccount", [
      process.env.STURDY_DEBT_MANAGER_OWNER || "",
    ]);

    owner_acct = await ethers.provider.getSigner(process.env.STURDY_DEBT_MANAGER_OWNER || ""); // Here we impersonate the debt manager owner to set perms
  }

  // set manual allocator of debt manager
  const debtManager = await ethers.getContractAt(
    "DebtManager",
    process.env.STURDY_DEBT_MANAGER || ""
  );

  await debtManager
    .connect(owner_acct)
    .setManualAllocator(process.env.STURDY_ALLOCATOR || "");

}

update().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
