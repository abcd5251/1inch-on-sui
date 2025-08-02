"use client";

import React, { useEffect, useState } from "react";
import { SecretManager } from "./SecretManager";
import { useCrossChainWallet } from "~~/hooks/cross-chain/useCrossChainWallet";
import { useCoins } from "~~/hooks/fusion/useCoins";
import { useFusionSDK } from "~~/hooks/fusion/useFusionSDK";
import { isWebCryptoSupported } from "~~/lib/crypto/webCryptoUtils";

export interface EnhancedOrderCreationFormData {
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
  // Enhanced security features
  secretConfig?: {
    keyId: string;
    secretHash: string;
    useClientSecret: boolean;
    requireSecretReveal: boolean;
  };
}

interface EnhancedOrderCreationFormProps {
  onSubmit?: (data: EnhancedOrderCreationFormData) => Promise<void>;
  isLoading?: boolean;
}

export const EnhancedOrderCreationForm: React.FC<EnhancedOrderCreationFormProps> = ({
  onSubmit,
  isLoading: externalLoading = false,
}) => {
  const { isFullyConnected, state } = useCrossChainWallet();
  const {
    createSimpleOrder,
    createDutchAuctionOrder,
    createCrossChainOrder,
    isInitialized: sdkInitialized,
  } = useFusionSDK();
  const { supportedTokens } = useCoins();

  // 表单状态
  const [formData, setFormData] = useState<EnhancedOrderCreationFormData>({
    makingAmount: "100",
    takingAmount: "95",
    orderType: "simple",
    permissions: {
      allowPartialFills: true,
      allowMultipleFills: false,
      requireWhitelist: false,
      maxFillsPerAddress: "1",
    },
    feeConfig: {
      makerFee: "0.1",
      takerFee: "0.2",
      protocolFee: "0.3",
      resolverFee: "0.1",
    },
    expiryHours: "24",
    secretConfig: {
      keyId: "",
      secretHash: "",
      useClientSecret: false,
      requireSecretReveal: false,
    },
  });

  // UI 状态
  const [activeStep, setActiveStep] = useState<"basic" | "advanced" | "security" | "review">("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isWebCryptoEnabled, setIsWebCryptoEnabled] = useState(false);

  // 初始化检查
  useEffect(() => {
    setIsWebCryptoEnabled(isWebCryptoSupported());
  }, []);

  // 表单验证
  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    // 基本验证
    if (!formData.makingAmount || parseFloat(formData.makingAmount) <= 0) {
      errors.makingAmount = "Making amount must be greater than 0";
    }
    if (!formData.takingAmount || parseFloat(formData.takingAmount) <= 0) {
      errors.takingAmount = "Taking amount must be greater than 0";
    }
    if (!formData.expiryHours || parseInt(formData.expiryHours) <= 0) {
      errors.expiryHours = "Expiry hours must be greater than 0";
    }

    // Dutch auction 验证
    if (formData.orderType === "dutch" && formData.auctionConfig) {
      if (!formData.auctionConfig.initialRate || parseFloat(formData.auctionConfig.initialRate) <= 0) {
        errors.initialRate = "Initial rate must be greater than 0";
      }
      if (!formData.auctionConfig.finalRate || parseFloat(formData.auctionConfig.finalRate) <= 0) {
        errors.finalRate = "Final rate must be greater than 0";
      }
      if (!formData.auctionConfig.duration || parseInt(formData.auctionConfig.duration) <= 0) {
        errors.duration = "Duration must be greater than 0";
      }
    }

    // Cross-chain 验证
    if (formData.orderType === "crosschain" && formData.crossChainConfig) {
      if (!formData.crossChainConfig.targetChainId) {
        errors.targetChainId = "Target chain ID is required";
      }
      if (
        !formData.crossChainConfig.safetyDepositAmount ||
        parseFloat(formData.crossChainConfig.safetyDepositAmount) <= 0
      ) {
        errors.safetyDepositAmount = "Safety deposit amount must be greater than 0";
      }
    }

    // 秘密配置验证
    if (formData.secretConfig?.useClientSecret && !formData.secretConfig.keyId) {
      errors.secretKeyId = "Please select or generate a client secret";
    }

    return errors;
  };

  // 处理表单提交
  const handleSubmit = async () => {
    setError(null);

    const errors = validateForm();
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError("Please fix the validation errors");
      return;
    }

    if (!isFullyConnected) {
      setError("Please connect both Ethereum and Sui wallets");
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理秘密生成
  const handleSecretGenerated = (keyId: string, hash: string) => {
    setFormData(prev => ({
      ...prev,
      secretConfig: {
        ...prev.secretConfig!,
        keyId,
        secretHash: hash,
        useClientSecret: true,
      },
    }));
  };

  // 处理秘密选择
  const handleSecretSelected = (keyId: string, hash: string) => {
    setFormData(prev => ({
      ...prev,
      secretConfig: {
        ...prev.secretConfig!,
        keyId,
        secretHash: hash,
        useClientSecret: true,
      },
    }));
  };

  // 更新表单数据的帮助函数
  const updateFormData = (path: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split(".");
      let current: any = newData;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  // 获取步骤进度
  const getStepProgress = () => {
    const steps = ["basic", "advanced", "security", "review"];
    const currentIndex = steps.indexOf(activeStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  return (
    <div className="bg-base-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">📝 Enhanced Order Creation</h2>
        <div className="text-sm text-gray-500">
          Step {["basic", "advanced", "security", "review"].indexOf(activeStep) + 1} of 4
        </div>
      </div>

      {/* 进度条 */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          {[
            { key: "basic", label: "Basic", icon: "📊" },
            { key: "advanced", label: "Advanced", icon: "⚙️" },
            { key: "security", label: "Security", icon: "🔐" },
            { key: "review", label: "Review", icon: "👀" },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveStep(key as any)}
              className={`btn btn-sm ${activeStep === key ? "btn-primary" : "btn-outline"}`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
        <progress className="progress progress-primary w-full" value={getStepProgress()} max="100"></progress>
      </div>

      {/* 错误消息 */}
      {error && (
        <div className="alert alert-error mb-4">
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
          <span>{error}</span>
        </div>
      )}

      {/* 基本配置步骤 */}
      {activeStep === "basic" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Order Type</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.orderType}
                onChange={e => updateFormData("orderType", e.target.value)}
              >
                <option value="simple">Simple Order</option>
                <option value="dutch">Dutch Auction</option>
                <option value="crosschain">Cross-Chain Order</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Expiry (Hours)</span>
              </label>
              <input
                type="number"
                className={`input input-bordered ${validationErrors.expiryHours ? "input-error" : ""}`}
                value={formData.expiryHours}
                onChange={e => updateFormData("expiryHours", e.target.value)}
                min="1"
                max="168"
              />
              {validationErrors.expiryHours && (
                <label className="label">
                  <span className="label-text-alt text-error">{validationErrors.expiryHours}</span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Making Amount</span>
              </label>
              <input
                type="number"
                className={`input input-bordered ${validationErrors.makingAmount ? "input-error" : ""}`}
                value={formData.makingAmount}
                onChange={e => updateFormData("makingAmount", e.target.value)}
                step="0.01"
                min="0"
              />
              {validationErrors.makingAmount && (
                <label className="label">
                  <span className="label-text-alt text-error">{validationErrors.makingAmount}</span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Taking Amount</span>
              </label>
              <input
                type="number"
                className={`input input-bordered ${validationErrors.takingAmount ? "input-error" : ""}`}
                value={formData.takingAmount}
                onChange={e => updateFormData("takingAmount", e.target.value)}
                step="0.01"
                min="0"
              />
              {validationErrors.takingAmount && (
                <label className="label">
                  <span className="label-text-alt text-error">{validationErrors.takingAmount}</span>
                </label>
              )}
            </div>
          </div>

          {/* Dutch Auction 配置 */}
          {formData.orderType === "dutch" && (
            <div className="bg-base-100 rounded-lg p-4">
              <h3 className="font-semibold mb-3">📈 Dutch Auction Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Initial Rate</span>
                  </label>
                  <input
                    type="number"
                    className={`input input-bordered ${validationErrors.initialRate ? "input-error" : ""}`}
                    value={formData.auctionConfig?.initialRate || ""}
                    onChange={e => updateFormData("auctionConfig.initialRate", e.target.value)}
                    step="0.001"
                    min="0"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Final Rate</span>
                  </label>
                  <input
                    type="number"
                    className={`input input-bordered ${validationErrors.finalRate ? "input-error" : ""}`}
                    value={formData.auctionConfig?.finalRate || ""}
                    onChange={e => updateFormData("auctionConfig.finalRate", e.target.value)}
                    step="0.001"
                    min="0"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Duration (Minutes)</span>
                  </label>
                  <input
                    type="number"
                    className={`input input-bordered ${validationErrors.duration ? "input-error" : ""}`}
                    value={formData.auctionConfig?.duration || ""}
                    onChange={e => updateFormData("auctionConfig.duration", e.target.value)}
                    min="1"
                  />
                </div>

                <div className="form-control md:col-span-3">
                  <label className="label">
                    <span className="label-text">Auction Type</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={formData.auctionConfig?.auctionType || "linear"}
                    onChange={e => updateFormData("auctionConfig.auctionType", e.target.value)}
                  >
                    <option value="linear">Linear Decay</option>
                    <option value="exponential">Exponential Decay</option>
                    <option value="competitive">Competitive Bidding</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Cross-Chain 配置 */}
          {formData.orderType === "crosschain" && (
            <div className="bg-base-100 rounded-lg p-4">
              <h3 className="font-semibold mb-3">🌉 Cross-Chain Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Target Chain</span>
                  </label>
                  <select
                    className={`select select-bordered ${validationErrors.targetChainId ? "select-error" : ""}`}
                    value={formData.crossChainConfig?.targetChainId || ""}
                    onChange={e => updateFormData("crossChainConfig.targetChainId", e.target.value)}
                  >
                    <option value="">Select Chain</option>
                    <option value="1">Ethereum Mainnet</option>
                    <option value="56">BSC Mainnet</option>
                    <option value="137">Polygon</option>
                    <option value="42161">Arbitrum</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Safety Deposit</span>
                  </label>
                  <input
                    type="number"
                    className={`input input-bordered ${validationErrors.safetyDepositAmount ? "input-error" : ""}`}
                    value={formData.crossChainConfig?.safetyDepositAmount || ""}
                    onChange={e => updateFormData("crossChainConfig.safetyDepositAmount", e.target.value)}
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 高级配置步骤 */}
      {activeStep === "advanced" && (
        <div className="space-y-4">
          <div className="bg-base-100 rounded-lg p-4">
            <h3 className="font-semibold mb-3">🔧 Permissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Allow Partial Fills</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={formData.permissions.allowPartialFills}
                    onChange={e => updateFormData("permissions.allowPartialFills", e.target.checked)}
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Allow Multiple Fills</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={formData.permissions.allowMultipleFills}
                    onChange={e => updateFormData("permissions.allowMultipleFills", e.target.checked)}
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Require Whitelist</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={formData.permissions.requireWhitelist}
                    onChange={e => updateFormData("permissions.requireWhitelist", e.target.checked)}
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Max Fills Per Address</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={formData.permissions.maxFillsPerAddress}
                  onChange={e => updateFormData("permissions.maxFillsPerAddress", e.target.value)}
                  min="1"
                />
              </div>
            </div>
          </div>

          <div className="bg-base-100 rounded-lg p-4">
            <h3 className="font-semibold mb-3">💰 Fee Configuration (%)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Maker Fee</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={formData.feeConfig.makerFee}
                  onChange={e => updateFormData("feeConfig.makerFee", e.target.value)}
                  step="0.01"
                  min="0"
                  max="10"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Taker Fee</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={formData.feeConfig.takerFee}
                  onChange={e => updateFormData("feeConfig.takerFee", e.target.value)}
                  step="0.01"
                  min="0"
                  max="10"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Protocol Fee</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={formData.feeConfig.protocolFee}
                  onChange={e => updateFormData("feeConfig.protocolFee", e.target.value)}
                  step="0.01"
                  min="0"
                  max="5"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Resolver Fee</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={formData.feeConfig.resolverFee}
                  onChange={e => updateFormData("feeConfig.resolverFee", e.target.value)}
                  step="0.01"
                  min="0"
                  max="5"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 安全配置步骤 */}
      {activeStep === "security" && (
        <div className="space-y-4">
          {isWebCryptoEnabled ? (
            <>
              <div className="bg-base-100 rounded-lg p-4">
                <h3 className="font-semibold mb-3">🔐 Client Secret Configuration</h3>
                <div className="form-control mb-4">
                  <label className="label cursor-pointer">
                    <span className="label-text">Use Client-Generated Secret</span>
                    <span className="label-text-alt text-info">Recommended for enhanced security</span>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={formData.secretConfig?.useClientSecret || false}
                      onChange={e => updateFormData("secretConfig.useClientSecret", e.target.checked)}
                    />
                  </label>
                </div>

                {formData.secretConfig?.useClientSecret && (
                  <>
                    <div className="form-control mb-4">
                      <label className="label cursor-pointer">
                        <span className="label-text">Require Secret Reveal for Settlement</span>
                        <span className="label-text-alt text-warning">Enables atomic swaps</span>
                        <input
                          type="checkbox"
                          className="checkbox checkbox-secondary"
                          checked={formData.secretConfig?.requireSecretReveal || false}
                          onChange={e => updateFormData("secretConfig.requireSecretReveal", e.target.checked)}
                        />
                      </label>
                    </div>

                    {formData.secretConfig.keyId && (
                      <div className="alert alert-success mb-4">
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
                          <div className="font-bold">Secret Ready!</div>
                          <div className="text-xs">ID: {formData.secretConfig.keyId.substring(0, 16)}...</div>
                          <div className="text-xs">Hash: {formData.secretConfig.secretHash.substring(0, 20)}...</div>
                        </div>
                      </div>
                    )}

                    <SecretManager
                      onSecretGenerated={handleSecretGenerated}
                      onSecretSelected={handleSecretSelected}
                      className="mt-4"
                    />
                  </>
                )}
              </div>

              <div className="bg-base-100 rounded-lg p-4">
                <h3 className="font-semibold mb-2">🛡️ Security Benefits</h3>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>
                    • <strong>Client Secrets:</strong> Generated locally using WebCrypto API
                  </li>
                  <li>
                    • <strong>Hash Locks:</strong> Secure atomic swap mechanism
                  </li>
                  <li>
                    • <strong>Time Locks:</strong> Automatic refund after expiry
                  </li>
                  <li>
                    • <strong>No Server Trust:</strong> Secrets never leave your browser
                  </li>
                  <li>
                    • <strong>Encrypted Storage:</strong> Password-protected local storage
                  </li>
                </ul>
              </div>
            </>
          ) : (
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
                <div className="font-bold">WebCrypto Not Supported</div>
                <div className="text-sm">
                  Client secret generation is not available in your browser. Orders will use server-generated secrets.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 审核步骤 */}
      {activeStep === "review" && (
        <div className="space-y-4">
          <div className="bg-base-100 rounded-lg p-4">
            <h3 className="font-semibold mb-3">👀 Order Summary</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-500">Order Type</div>
                <div className="font-medium capitalize">{formData.orderType}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Expires In</div>
                <div className="font-medium">{formData.expiryHours} hours</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Making Amount</div>
                <div className="font-medium">{formData.makingAmount} tokens</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Taking Amount</div>
                <div className="font-medium">{formData.takingAmount} tokens</div>
              </div>
            </div>

            {formData.secretConfig?.useClientSecret && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-green-600 dark:text-green-400">🔐</span>
                  <div>
                    <div className="font-medium text-green-800 dark:text-green-200">Enhanced Security Enabled</div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      Using client-generated secret for atomic swap protection
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
                <div>
                  <div className="font-medium text-yellow-800 dark:text-yellow-200">Review Carefully</div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">
                    Orders cannot be modified after creation. Ensure all details are correct.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 导航按钮 */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => {
            const steps = ["basic", "advanced", "security", "review"];
            const currentIndex = steps.indexOf(activeStep);
            if (currentIndex > 0) {
              setActiveStep(steps[currentIndex - 1] as any);
            }
          }}
          className="btn btn-outline"
          disabled={activeStep === "basic"}
        >
          ← Previous
        </button>

        {activeStep !== "review" ? (
          <button
            onClick={() => {
              const steps = ["basic", "advanced", "security", "review"];
              const currentIndex = steps.indexOf(activeStep);
              if (currentIndex < steps.length - 1) {
                setActiveStep(steps[currentIndex + 1] as any);
              }
            }}
            className="btn btn-primary"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className={`btn btn-success ${isSubmitting || externalLoading ? "loading" : ""}`}
            disabled={isSubmitting || externalLoading || !isFullyConnected}
          >
            🚀 Create Order
          </button>
        )}
      </div>

      {/* 连接状态提示 */}
      {!isFullyConnected && (
        <div className="alert alert-warning mt-4">
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
          <span>Connect both Ethereum and Sui wallets to create orders</span>
        </div>
      )}
    </div>
  );
};
