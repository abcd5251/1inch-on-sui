"use client";

import { useEffect, useState } from "react";
import { useCrossChainWallet } from "~~/hooks/cross-chain/useCrossChainWallet";
import { useCoins } from "~~/hooks/fusion/useCoins";
import { useFusionSDK } from "~~/hooks/fusion/useFusionSDK";

export interface OrderCreationFormData {
  makingAmount: string;
  takingAmount: string;
  orderType: "simple" | "dutch" | "crosschain";
  permissions: {
    allowPartialFills: boolean;
    allowMultipleFills: boolean;
    requireWhitelist: boolean;
    maxFillsPerAddress: string;
  };
  feeConfig: {
    makerFee: string;
    takerFee: string;
    protocolFee: string;
    resolverFee: string;
  };
  expiryHours: string;
  // Dutch auction specific
  auctionConfig?: {
    initialRate: string;
    finalRate: string;
    duration: string;
    auctionType: "linear" | "exponential" | "competitive";
  };
  // Cross-chain specific
  crossChainConfig?: {
    targetChainId: string;
    safetyDepositAmount: string;
  };
}

interface OrderCreationFormProps {
  onSubmit?: (data: OrderCreationFormData) => Promise<void>;
  isLoading?: boolean;
}

export const OrderCreationForm = ({ onSubmit, isLoading: externalLoading = false }: OrderCreationFormProps) => {
  const { isFullyConnected, state } = useCrossChainWallet();
  const {
    createSimpleOrder,
    createDutchAuctionOrder,
    createCrossChainOrder,
    isInitialized: sdkInitialized,
    initError,
  } = useFusionSDK();
  const {
    coins,
    suiCoins,
    suiBalance,
    formatBalance,
    parseAmount,
    selectCoinsForAmount,
    hasEnoughBalance,
    isLoading: coinsLoading,
  } = useCoins();

  const [internalLoading, setInternalLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const isLoading = externalLoading || internalLoading;

  const [formData, setFormData] = useState<OrderCreationFormData>({
    makingAmount: "",
    takingAmount: "",
    orderType: "simple",
    permissions: {
      allowPartialFills: true,
      allowMultipleFills: false,
      requireWhitelist: false,
      maxFillsPerAddress: "1",
    },
    feeConfig: {
      makerFee: "0",
      takerFee: "30", // 0.3%
      protocolFee: "10", // 0.1%
      resolverFee: "0",
    },
    expiryHours: "24",
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof OrderCreationFormData],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  // 清除消息
  const clearMessages = () => {
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  // 验证表单
  const validateForm = (): string | null => {
    if (!isFullyConnected) {
      return "Please connect both Ethereum and Sui wallets";
    }

    if (!sdkInitialized) {
      return "Fusion SDK not initialized";
    }

    if (!formData.makingAmount || parseFloat(formData.makingAmount) <= 0) {
      return "Please enter a valid making amount";
    }

    if (!formData.takingAmount || parseFloat(formData.takingAmount) <= 0) {
      return "Please enter a valid taking amount";
    }

    // 检查 SUI 余额是否足够
    const makingAmountWei = parseAmount(formData.makingAmount, 9);
    if (!hasEnoughBalance("0x2::sui::SUI", makingAmountWei)) {
      return `Insufficient SUI balance. Required: ${formData.makingAmount} SUI, Available: ${formatBalance(suiBalance, 9)} SUI`;
    }

    // 跨链订单需要安全保证金
    if (formData.orderType === "crosschain") {
      const safetyAmount = formData.crossChainConfig?.safetyDepositAmount || "0";
      const safetyAmountWei = parseAmount(safetyAmount, 9);
      const totalRequired = BigInt(makingAmountWei) + BigInt(safetyAmountWei);

      if (!hasEnoughBalance("0x2::sui::SUI", totalRequired.toString())) {
        return `Insufficient SUI balance for cross-chain order. Required: ${formatBalance(totalRequired.toString(), 9)} SUI (including safety deposit)`;
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const validationError = validateForm();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setInternalLoading(true);

    try {
      // 选择代币对象
      const makingAmountWei = parseAmount(formData.makingAmount, 9);
      const selectedCoins = selectCoinsForAmount("0x2::sui::SUI", makingAmountWei);

      if (selectedCoins.length === 0) {
        throw new Error("No suitable SUI coins found");
      }

      // 使用第一个代币对象（实际应用中可能需要合并多个代币对象）
      const makingCoinId = selectedCoins[0].coinObjectId;

      let result;

      if (formData.orderType === "simple") {
        // 创建简单订单
        const orderParams = {
          makingAmount: makingAmountWei,
          takingAmount: parseAmount(formData.takingAmount, 6), // 假设 USDC 6位小数
          permissions: {
            allowPartialFills: formData.permissions.allowPartialFills,
            allowMultipleFills: formData.permissions.allowMultipleFills,
            requireWhitelist: formData.permissions.requireWhitelist,
            whitelistedFillers: [],
            maxFillsPerAddress: formData.permissions.maxFillsPerAddress,
          },
          feeConfig: {
            makerFee: formData.feeConfig.makerFee,
            takerFee: formData.feeConfig.takerFee,
            protocolFee: formData.feeConfig.protocolFee,
            resolverFee: formData.feeConfig.resolverFee,
            feeRecipient: state.sui.address || "",
          },
          expiryTime: (Date.now() + parseInt(formData.expiryHours) * 3600000).toString(),
          metadata: new Uint8Array(0),
        };

        result = await createSimpleOrder(orderParams, makingCoinId);
      } else if (formData.orderType === "dutch") {
        // 创建荷兰拍卖订单
        const auctionParams = {
          makingAmount: makingAmountWei,
          takingAmount: parseAmount(formData.takingAmount, 6),
          auctionConfig: {
            auctionType: formData.auctionConfig?.auctionType || "linear",
            initialRate: parseAmount(formData.auctionConfig?.initialRate || "0", 6),
            finalRate: parseAmount(formData.auctionConfig?.finalRate || "0", 6),
            duration: (parseInt(formData.auctionConfig?.duration || "60") * 60000).toString(), // 转换为毫秒
            startTime: Date.now().toString(),
            decayFactor: "0",
            reservePrice: parseAmount(formData.auctionConfig?.finalRate || "0", 6),
            competitiveThreshold: "5",
          },
          permissions: {
            allowPartialFills: formData.permissions.allowPartialFills,
            allowMultipleFills: formData.permissions.allowMultipleFills,
            requireWhitelist: formData.permissions.requireWhitelist,
            whitelistedFillers: [],
            maxFillsPerAddress: formData.permissions.maxFillsPerAddress,
          },
          feeConfig: {
            makerFee: formData.feeConfig.makerFee,
            takerFee: formData.feeConfig.takerFee,
            protocolFee: formData.feeConfig.protocolFee,
            resolverFee: formData.feeConfig.resolverFee,
            feeRecipient: state.sui.address || "",
          },
          expiryTime: (Date.now() + parseInt(formData.expiryHours) * 3600000).toString(),
          metadata: new Uint8Array(0),
        };

        result = await createDutchAuctionOrder(auctionParams, makingCoinId);
      } else if (formData.orderType === "crosschain") {
        // 创建跨链订单
        const safetyDepositAmount = parseAmount(formData.crossChainConfig?.safetyDepositAmount || "0.1", 9);
        const safetyDepositCoins = selectCoinsForAmount("0x2::sui::SUI", safetyDepositAmount);
        const safetyDepositId = safetyDepositCoins[0].coinObjectId;

        const crossChainParams = {
          makingAmount: makingAmountWei,
          takingAmount: parseAmount(formData.takingAmount, 6),
          targetChainId: formData.crossChainConfig?.targetChainId || "1",
          evmOrderHash: new Uint8Array(32), // 需要从 EVM 侧获取
          contractAddress: new Uint8Array(20), // EVM 合约地址
          tokenAddress: new Uint8Array(20), // USDC token 地址
          recipient: new Uint8Array(20), // 接收者地址
          safetyDepositAmount,
          timeLockConfig: {
            srcWithdrawalDelay: "3600000", // 1小时
            dstWithdrawalDelay: "7200000", // 2小时
            srcPublicWithdrawalDelay: "86400000", // 24小时
            dstPublicWithdrawalDelay: "172800000", // 48小时
            emergencyWithdrawalDelay: "259200000", // 72小时
          },
          secret: new Uint8Array(32), // 生成随机密钥
          permissions: {
            allowPartialFills: false,
            allowMultipleFills: false,
            requireWhitelist: formData.permissions.requireWhitelist,
            whitelistedFillers: [],
            maxFillsPerAddress: "1",
          },
          feeConfig: {
            makerFee: formData.feeConfig.makerFee,
            takerFee: formData.feeConfig.takerFee,
            protocolFee: formData.feeConfig.protocolFee,
            resolverFee: formData.feeConfig.resolverFee,
            feeRecipient: state.sui.address || "",
          },
          expiryTime: (Date.now() + parseInt(formData.expiryHours) * 3600000).toString(),
          metadata: new Uint8Array(0),
        };

        result = await createCrossChainOrder(crossChainParams, makingCoinId, safetyDepositId);
      }

      if (result) {
        setSubmitSuccess(`${formData.orderType} order created successfully! Transaction: ${result.digest}`);

        // 重置表单
        setFormData({
          ...formData,
          makingAmount: "",
          takingAmount: "",
        });

        // 调用外部回调
        if (onSubmit) {
          await onSubmit(formData);
        }
      }
    } catch (error) {
      console.error("Failed to create order:", error);
      setSubmitError(error instanceof Error ? error.message : "Failed to create order");
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <div className="bg-base-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Create Order</h2>

        {/* 余额显示 */}
        <div className="text-right">
          <div className="text-sm text-gray-600 dark:text-gray-400">SUI Balance</div>
          <div className="font-medium">
            {coinsLoading ? (
              <div className="loading loading-spinner loading-xs"></div>
            ) : (
              `${formatBalance(suiBalance, 9)} SUI`
            )}
          </div>
        </div>
      </div>

      {/* SDK 状态检查 */}
      {!sdkInitialized && (
        <div className="alert alert-warning mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div>
            <div className="font-medium">Fusion SDK Not Ready</div>
            <div className="text-sm">{initError || "Initializing..."}</div>
          </div>
        </div>
      )}

      {/* 成功消息 */}
      {submitSuccess && (
        <div className="alert alert-success mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <div className="font-medium">Success!</div>
            <div className="text-sm">{submitSuccess}</div>
          </div>
          <button onClick={clearMessages} className="btn btn-ghost btn-sm">
            ×
          </button>
        </div>
      )}

      {/* 错误消息 */}
      {submitError && (
        <div className="alert alert-error mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <div className="font-medium">Error</div>
            <div className="text-sm">{submitError}</div>
          </div>
          <button onClick={clearMessages} className="btn btn-ghost btn-sm">
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Type Selection */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Order Type</span>
          </label>
          <div className="flex gap-4">
            {[
              { value: "simple", label: "Simple Order" },
              { value: "dutch", label: "Dutch Auction" },
              { value: "crosschain", label: "Cross-Chain" },
            ].map(type => (
              <label key={type.value} className="cursor-pointer label">
                <input
                  type="radio"
                  name="orderType"
                  value={type.value}
                  checked={formData.orderType === type.value}
                  onChange={e => handleInputChange("orderType", e.target.value)}
                  className="radio radio-primary"
                />
                <span className="label-text ml-2">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Token Amounts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Making Amount (SUI)</span>
            </label>
            <input
              type="number"
              step="0.000000001"
              placeholder="1.0"
              value={formData.makingAmount}
              onChange={e => handleInputChange("makingAmount", e.target.value)}
              className="input input-bordered"
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Taking Amount (USDC)</span>
            </label>
            <input
              type="number"
              step="0.000001"
              placeholder="2.0"
              value={formData.takingAmount}
              onChange={e => handleInputChange("takingAmount", e.target.value)}
              className="input input-bordered"
              required
            />
          </div>
        </div>

        {/* Dutch Auction Configuration */}
        {formData.orderType === "dutch" && (
          <div className="bg-base-100 p-4 rounded-lg border">
            <h3 className="font-semibold mb-4">Dutch Auction Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Initial Rate</span>
                </label>
                <input
                  type="number"
                  step="0.000001"
                  placeholder="2.2"
                  value={formData.auctionConfig?.initialRate || ""}
                  onChange={e => handleInputChange("auctionConfig.initialRate", e.target.value)}
                  className="input input-bordered input-sm"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Final Rate</span>
                </label>
                <input
                  type="number"
                  step="0.000001"
                  placeholder="1.8"
                  value={formData.auctionConfig?.finalRate || ""}
                  onChange={e => handleInputChange("auctionConfig.finalRate", e.target.value)}
                  className="input input-bordered input-sm"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Duration (minutes)</span>
                </label>
                <input
                  type="number"
                  placeholder="60"
                  value={formData.auctionConfig?.duration || ""}
                  onChange={e => handleInputChange("auctionConfig.duration", e.target.value)}
                  className="input input-bordered input-sm"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Auction Type</span>
                </label>
                <select
                  value={formData.auctionConfig?.auctionType || "linear"}
                  onChange={e => handleInputChange("auctionConfig.auctionType", e.target.value)}
                  className="select select-bordered select-sm"
                >
                  <option value="linear">Linear</option>
                  <option value="exponential">Exponential</option>
                  <option value="competitive">Competitive</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Cross-Chain Configuration */}
        {formData.orderType === "crosschain" && (
          <div className="bg-base-100 p-4 rounded-lg border">
            <h3 className="font-semibold mb-4">Cross-Chain Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Target Chain</span>
                </label>
                <select
                  value={formData.crossChainConfig?.targetChainId || "1"}
                  onChange={e => handleInputChange("crossChainConfig.targetChainId", e.target.value)}
                  className="select select-bordered select-sm"
                >
                  <option value="1">Ethereum Mainnet</option>
                  <option value="11155111">Ethereum Sepolia</option>
                  <option value="56">BSC Mainnet</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Safety Deposit (SUI)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.1"
                  value={formData.crossChainConfig?.safetyDepositAmount || ""}
                  onChange={e => handleInputChange("crossChainConfig.safetyDepositAmount", e.target.value)}
                  className="input input-bordered input-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Permissions */}
        <div className="bg-base-100 p-4 rounded-lg border">
          <h3 className="font-semibold mb-4">Order Permissions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="cursor-pointer label">
                <span className="label-text">Allow Partial Fills</span>
                <input
                  type="checkbox"
                  checked={formData.permissions.allowPartialFills}
                  onChange={e => handleInputChange("permissions.allowPartialFills", e.target.checked)}
                  className="checkbox checkbox-primary"
                />
              </label>
            </div>

            <div className="form-control">
              <label className="cursor-pointer label">
                <span className="label-text">Allow Multiple Fills</span>
                <input
                  type="checkbox"
                  checked={formData.permissions.allowMultipleFills}
                  onChange={e => handleInputChange("permissions.allowMultipleFills", e.target.checked)}
                  className="checkbox checkbox-primary"
                />
              </label>
            </div>

            <div className="form-control">
              <label className="cursor-pointer label">
                <span className="label-text">Require Whitelist</span>
                <input
                  type="checkbox"
                  checked={formData.permissions.requireWhitelist}
                  onChange={e => handleInputChange("permissions.requireWhitelist", e.target.checked)}
                  className="checkbox checkbox-primary"
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Max Fills Per Address</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.permissions.maxFillsPerAddress}
                onChange={e => handleInputChange("permissions.maxFillsPerAddress", e.target.value)}
                className="input input-bordered input-sm"
              />
            </div>
          </div>
        </div>

        {/* Fee Configuration */}
        <div className="bg-base-100 p-4 rounded-lg border">
          <h3 className="font-semibold mb-4">Fee Configuration (Basis Points)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Maker Fee</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.feeConfig.makerFee}
                onChange={e => handleInputChange("feeConfig.makerFee", e.target.value)}
                className="input input-bordered input-sm"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Taker Fee</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.feeConfig.takerFee}
                onChange={e => handleInputChange("feeConfig.takerFee", e.target.value)}
                className="input input-bordered input-sm"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Protocol Fee</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.feeConfig.protocolFee}
                onChange={e => handleInputChange("feeConfig.protocolFee", e.target.value)}
                className="input input-bordered input-sm"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Resolver Fee</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.feeConfig.resolverFee}
                onChange={e => handleInputChange("feeConfig.resolverFee", e.target.value)}
                className="input input-bordered input-sm"
              />
            </div>
          </div>
        </div>

        {/* Order Expiry */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Order Expiry (Hours)</span>
          </label>
          <input
            type="number"
            min="1"
            max="168"
            value={formData.expiryHours}
            onChange={e => handleInputChange("expiryHours", e.target.value)}
            className="input input-bordered"
          />
          <label className="label">
            <span className="label-text-alt">Order will expire in {formData.expiryHours} hours</span>
          </label>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button type="submit" disabled={!isFullyConnected || isLoading} className="btn btn-primary">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="loading loading-spinner loading-sm"></div>
                Creating Order...
              </div>
            ) : (
              `Create ${formData.orderType === "simple" ? "Simple" : formData.orderType === "dutch" ? "Dutch Auction" : "Cross-Chain"} Order`
            )}
          </button>
        </div>

        {/* Wallet Connection Warning */}
        {!isFullyConnected && (
          <div className="alert alert-warning">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <div>
              <div className="font-medium">Wallet Connection Required</div>
              <div className="text-sm">
                {!state.ethereum.isConnected &&
                  !state.sui.isConnected &&
                  "Connect both Ethereum and Sui wallets to create orders"}
                {state.ethereum.isConnected && !state.sui.isConnected && "Connect Sui wallet to continue"}
                {!state.ethereum.isConnected && state.sui.isConnected && "Connect Ethereum wallet to continue"}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
