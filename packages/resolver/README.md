# 1inch Fusion Protocol Resolver

Core smart contract resolver component for the 1inch on Sui project, responsible for handling cross-chain atomic swap logic between Ethereum and Sui blockchains.

## 🎯 Project Overview

Resolver is the core component of the 1inch Fusion Protocol cross-chain swap solution, implementing secure, decentralized atomic swap functionality between Ethereum and Sui blockchains. This component ensures atomicity, security, and reliability of cross-chain transactions.

## 🏗️ Architecture Components

### EVM Contracts (`/evm`)
- **Smart Contracts**: Solidity-based smart contracts for the Ethereum side
- **Foundry Framework**: Using Foundry for contract development, testing, and deployment
- **OpenZeppelin**: Integration of battle-tested security contract libraries
- **Deployment Scripts**: Automated contract deployment and verification workflows

### Sui Move Contracts (`/sui_move`)
- **Move Smart Contracts**: Sui Move language-based smart contracts for the Sui side
- **Native Integration**: Fully leveraging Sui blockchain's unique features
- **Type Safety**: Strong type safety guarantees provided by the Move language

## 🔐 Core Features

### Hashlock
- Uses cryptographic hashes to ensure transaction atomicity
- Prevents unilateral defaults and fund losses
- Supports multiple hash algorithms

### Timelock
- Sets transaction timeout mechanisms
- Automatic refund functionality
- Prevents permanent fund locking

### Bidirectional Swaps
- **Ethereum → Sui**: Cross-chain swaps from Ethereum to Sui
- **Sui → Ethereum**: Cross-chain swaps from Sui to Ethereum
- Symmetric swap logic and security guarantees

## 🛠️ Tech Stack

### EVM Side
- **Solidity**: ^0.8.0
- **Foundry**: Contract development framework
- **OpenZeppelin**: Security contract library
- **Forge**: Testing and deployment tools

### Sui Side
- **Sui Move**: 2024.beta edition
- **Sui Framework**: Native blockchain functionality
- **Move Prover**: Formal verification tools

## 📋 System Requirements

### EVM Development Environment
- [Foundry](https://getfoundry.sh/) >= 0.2.0
- Node.js >= 18.0.0
- Git

### Sui Development Environment
- [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install) >= 1.0.0
- Rust >= 1.70.0

## 🚀 Quick Start

### EVM Contract Development

```bash
# Enter EVM directory
cd evm

# Install dependencies
forge install

# Compile contracts
forge build

# Run tests
forge test

# Deploy to local network
forge script script/Deploy.s.sol --rpc-url localhost --broadcast
```

### Sui Move Contract Development

```bash
# Enter Sui Move directory
cd sui_move

# Build contracts
sui move build

# Run tests
sui move test

# Publish to testnet
sui client publish --gas-budget 20000000
```

## 🔄 Workflow

1. **Initiate Swap**: User initiates cross-chain swap request on source chain
2. **Lock Funds**: Smart contract locks user funds and generates hashlock
3. **Cross-chain Communication**: Relayer monitors events and executes corresponding operations on target chain
4. **Atomic Execution**: Ensures atomicity of operations on both chains through hashlock
5. **Complete Swap**: User receives funds on target chain, swap completed
6. **Timeout Handling**: Automatic refund to original user if timeout occurs

## 🔗 Related Projects

- **[Relayer](../relayer/)**: Cross-chain event monitoring and coordination service
- **[NextJS Frontend](../nextjs/)**: User interface and interaction frontend
- **[1inch Fusion Protocol](https://1inch.io/fusion/)**: Official 1inch Fusion Protocol

## 🏆 ETHGlobal Unite Hackathon

This project is built for the [ETHGlobal Unite Hackathon's 1inch challenge](https://ethglobal.com/events/unite/prizes/1inch), aiming to expand 1inch Cross-chain Swap (Fusion+) to the Sui blockchain.

### Challenge Requirements
- ✅ **Preserve Hashlock and Timelock Functionality**
- ✅ **Bidirectional Swap Support**
- ✅ **On-chain Demo**
- ✅ **EVM and Sui Move Contracts**

## 📄 License

MIT License - See the LICENSE file in the project root directory for details.

## 🤝 Contributing

Welcome to submit Issues and Pull Requests! Please check CONTRIBUTING.md in the project root directory for contribution guidelines.

---

**Note**: This is a development version for demonstration and testing purposes. Please ensure thorough security audits before using in production environments.