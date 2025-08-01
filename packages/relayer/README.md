# 1inch Fusion Protocol Relayer (Development Copy)

A development copy of the 1inch Fusion Protocol cross-chain relayer service on Sui blockchain, responsible for coordinating cross-chain atomic swaps between Ethereum and Sui.

## 🚀 Features

- **Cross-chain Atomic Swaps**: Secure cross-chain transactions between Ethereum and Sui
- **Order Management**: Complete order lifecycle management
- **Real-time Monitoring**: Blockchain event listening and state synchronization
- **High Performance**: Built with Bun and ElysiaJS for ultimate performance
- **Type Safety**: Full TypeScript support

## 📋 System Requirements

- [Bun](https://bun.sh) >= 1.2.0
- TypeScript >= 5.0.0

## 🛠️ Installation & Running

1. Install dependencies:
```bash
bun install
```

2. Run in development mode:
```bash
bun run dev
```

3. Access the service:
Open http://localhost:3000/ to check service status

## 🏗️ Architecture Overview

This project is a development version of the 1inch Fusion Protocol cross-chain relayer, with main functionalities including:

### Core Components
- **EVM Chain Listener**: Monitors Fusion contract events on Ethereum
- **Sui Chain Listener**: Monitors related transactions on Sui blockchain
- **Order Executor**: Handles cross-chain atomic swap logic
- **State Manager**: Maintains order status and transaction records

### Workflow
1. Listen for cross-chain swap requests on EVM chains
2. Validate transaction validity and user funds
3. Execute corresponding swap operations on Sui chain
4. Ensure atomicity and security
5. Update order status and notify relevant parties

## 🔗 Related Projects

- Main Relayer Service: `../relayer/`
- Frontend Interface: `../nextjs/`
- Smart Contracts: `../foundry/`

## 📝 Notes

This is a development copy for feature testing and experimentation. Please use the main relayer service for production environments.

## 🤝 Contributing

Welcome to submit Issues and Pull Requests to improve the project.
