import { ethers } from "hardhat";
import { IAirnodeRrpV0 } from "../typechain";

async function main() {
    const allocator = await ethers.getContractAt(
        "IAirnodeRrpV0",
        process.env.AIRNODE_RRP || ""
    ) as IAirnodeRrpV0;

    const filter = allocator.filters.MadeFullRequest(process.env.AIRNODE_RRP);
    const result = await ethers.provider.getLogs(filter);
    console.log(result);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
