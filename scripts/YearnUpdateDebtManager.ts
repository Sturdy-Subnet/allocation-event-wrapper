// eslint-disable-next-line node/no-missing-import
import { ethers } from "hardhat";
import dotenv from "dotenv";
import { Signer } from "ethers";
import { IDebtAllocator, IDebtAllocatorFactory } from "../typechain-types";


// NOTE: this may need to be changed i.e. if using a multi sig wallet
async function update() {
  dotenv.config();

  const acct = (await ethers.getSigners())[0] as Signer
  var owner_acct = acct

  const network = await ethers.provider.getNetwork()

  // NOTE: this may need to be changed i.e. if using a multi sig wallet
  if (network.chainId == ethers.toBigInt(31337)) {
    console.log("impersonating acct..")
    await ethers.provider.send("hardhat_impersonateAccount", [
      process.env.YEARN_DEBT_MANAGER,
    ]);

    await acct.sendTransaction({
      to: process.env.YEARN_DEBT_MANAGER,
      value: ethers.parseUnits('1', 'ether'),
      gasLimit: 300000,
    })

    owner_acct = await ethers.provider.getSigner(process.env.YEARN_DEBT_MANAGER); // Here we impersonate the debt manager owner to set perms
  }

  const debtAllocator: IDebtAllocator = await ethers.getContractAt(
    "IDebtAllocator",
    process.env.YEARN_DEBT_ALLOCATOR || ""
  ) as IDebtAllocator;

  const debtAllocatorFactory: IDebtAllocatorFactory = await ethers.getContractAt(
    "IDebtAllocatorFactory",
    process.env.YEARN_DEBT_ALLOCATOR_FACTORY || ""
  ) as IDebtAllocatorFactory;

  // set manager of the debt allocator to be the deployed allocation contract
  await debtAllocator.connect(owner_acct).setManager(process.env.YEARN_ALLOCATOR || "", true);
  // set keeper of the debt allocator to be the deployed allocation contract
  await debtAllocatorFactory.connect(owner_acct).setKeeper(process.env.YEARN_ALLOCATOR || "", true, {gasLimit: 300000});
  console.log("done");

}

update().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
