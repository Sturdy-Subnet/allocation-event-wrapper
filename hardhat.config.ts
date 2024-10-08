import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
// import "@nomiclabs/hardhat-waffle";
import "@nomicfoundation/hardhat-toolbox";
// import "@typechain/hardhat";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "hardhat-gas-reporter";
// import "solidity-coverage";
import "hardhat-tracer";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.21",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      forking: {
        enabled: true,
        url: process.env.MAINNET_URL || "",
        // blockNumber: 19021523,
        blockNumber: 20359700,
        // blockNumber: 20817480,
      },
      initialBaseFeePerGas: 109851462,
      accounts: [
        {
          privateKey: process.env.PRIVATE_KEY?.toString() || "",
          balance: "1000000000000000000000000"
        }
      ]
      // accounts: {
      //   mnemonic:
      //     process.env.MNEMONIC ||
      //     "test test test test test test test test test test test junk",
      // },
    },
    local: {
      url: "http://127.0.0.1:8545",
      accounts: {
        mnemonic:
          process.env.MNEMONIC ||
          "test test test test test test test test test test test junk",
      },
    },
    mainnet: {
      url: process.env.MAINNET_URL || "",
      accounts: [
        process.env.PRIVATE_KEY?.toString() || "",
      ]
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
