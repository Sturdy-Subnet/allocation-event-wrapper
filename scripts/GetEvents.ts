import { ethers } from "hardhat";

async function main() {
    const allocator = await ethers.getContractAt(
        "YearnAirnodeAllocator",
        "0x00b0517de6b2b09abd3a7b69d66d85efdb2c7d94"
    );

    // const filter = allocator.filters.AllocationEvent(null, null, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    const filter = allocator.filters.AllocationEvent("0x837b1b59205e6ad8c00af4d523848ba3584d518648ccba88025e582ddf5cf0c2");
    const result = await ethers.provider.getLogs(filter);
    console.log(result);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
