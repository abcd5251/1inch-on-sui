import { FusionSDK, PrivateKeyProviderConnector, OrderInfo } from "@1inch/fusion-sdk";
import { NetworkEnum, PresetEnum, Quote } from "@1inch/fusion-sdk/api";
import Web3 from "web3";
import { fusionConfig } from "./config";

export interface FusionServiceConfig {
  network: NetworkEnum;
  rpcUrl: string;
  authKey?: string;
}

export interface SwapParams {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  walletAddress: string;
  preset?: PresetEnum;
}

export interface QuoteParams {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
}

export class FusionService {
  private sdk: FusionSDK | null = null;
  private web3: Web3;
  private config: FusionServiceConfig;

  constructor(config: FusionServiceConfig) {
    this.config = config;
    this.web3 = new Web3(new Web3.providers.HttpProvider(config.rpcUrl));
  }

  /**
   * Initialize the Fusion SDK with a private key
   */
  async initializeWithPrivateKey(privateKey: string): Promise<void> {
    const blockchainProvider = new PrivateKeyProviderConnector(
      privateKey,
      // @ts-ignore
      this.web3
    );

    this.sdk = new FusionSDK({
      url: fusionConfig.apiUrl,
      network: this.config.network,
      blockchainProvider,
      authKey: this.config.authKey,
    });
  }

  /**
   * Get a quote for token swap
   */
  async getQuote(params: QuoteParams): Promise<Quote> {
    if (!this.sdk) {
      throw new Error("SDK not initialized. Call initializeWithPrivateKey first.");
    }

    return await this.sdk.getQuote({
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
    });
  }

  /**
   * Create a swap order
   */
  async createOrder(params: SwapParams): Promise<OrderInfo> {
    if (!this.sdk) {
      throw new Error("SDK not initialized. Call initializeWithPrivateKey first.");
    }

    return await this.sdk.placeOrder({
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
      walletAddress: params.walletAddress,
      preset: params.preset || PresetEnum.fast,
    });
  }

  /**
   * Get active orders
   */
  async getActiveOrders(page: number = 1, limit: number = 10) {
    if (!this.sdk) {
      throw new Error("SDK not initialized. Call initializeWithPrivateKey first.");
    }

    return await this.sdk.getActiveOrders({ page, limit });
  }

  /**
   * Get orders by maker address
   */
  async getOrdersByMaker(address: string, page: number = 1, limit: number = 10) {
    if (!this.sdk) {
      throw new Error("SDK not initialized. Call initializeWithPrivateKey first.");
    }

    return await this.sdk.getOrdersByMaker({
      address,
      page,
      limit,
    });
  }

  /**
   * Approve ERC20 token for spending
   */
  async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: string,
    privateKey: string
  ): Promise<string> {
    const ERC20_ABI = [
      {
        constant: false,
        inputs: [
          { name: "spender", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ name: "", type: "bool" }],
        type: "function",
      },
    ];

    const tokenContract = new this.web3.eth.Contract(ERC20_ABI, tokenAddress);
    const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
    
    // @ts-ignore
    const approvalData = tokenContract.methods.approve(spenderAddress, amount).encodeABI();

    const signedTransaction = await this.web3.eth.accounts.signTransaction(
      {
        to: tokenAddress,
        data: approvalData,
        gas: fusionConfig.gasLimits.approve.toString(),
      },
      privateKey
    );

    if (!signedTransaction.rawTransaction) {
      throw new Error("Failed to sign transaction");
    }

    const receipt = await this.web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
    return receipt.transactionHash;
  }

  /**
   * Get wallet address from private key
   */
  getAddressFromPrivateKey(privateKey: string): string {
    const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
    return account.address;
  }

  /**
   * Get router address for current network
   */
  getRouterAddress(): string {
    return fusionConfig.routers[this.config.network];
  }

  /**
   * Get token addresses for current network
   */
  getTokenAddresses() {
    return fusionConfig.tokens[this.config.network];
  }
}