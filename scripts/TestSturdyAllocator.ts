// eslint-disable-next-line node/no-missing-import
import { run } from "./SturdyAllocator";
import { ethers } from "hardhat";

async function test() {
  const provider = new ethers.providers.JsonRpcProvider(
    "http://127.0.0.1:8545"
  );

  await provider.send("hardhat_impersonateAccount", [
    process.env.DEBT_MANAGER_OWNER || "",
  ]);
  const acct = provider.getSigner(process.env.DEBT_MANAGER_OWNER || "");
  await run(acct);
}

test().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
