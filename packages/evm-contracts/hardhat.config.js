require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      // Local network configuration
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      verify: {
        etherscan: {
          apiKey: process.env.ETHERSCAN_API_KEY
        }
      },
      // 1inch Fusion settlement address for Sepolia
      fusionSettlement: "0x1111111254eeb25477b68fb85ed929f73a960582"
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      verify: {
        etherscan: {
          apiKey: process.env.ETHERSCAN_API_KEY
        }
      },
      // 1inch Fusion settlement address for Base Sepolia
      fusionSettlement: "0x1111111254eeb25477b68fb85ed929f73a960582"
    }
  }
};