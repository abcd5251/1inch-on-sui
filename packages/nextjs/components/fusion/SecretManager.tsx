"use client";

import React, { useCallback, useEffect, useState } from "react";
import { encryptedStorage } from "~~/lib/crypto/encryptedStorage";
import { type SecretMetadata, secretManager } from "~~/lib/crypto/secretManager";
import { isWebCryptoSupported } from "~~/lib/crypto/webCryptoUtils";

/**
 * 客户端秘密管理器 UI 组件
 * 提供安全的客户端秘密生成、存储和管理功能
 */

interface SecretManagerProps {
  onSecretGenerated?: (keyId: string, hash: string) => void;
  onSecretSelected?: (keyId: string, hash: string) => void;
  className?: string;
}

interface SecretGenerationOptions {
  alias: string;
  purpose: string;
  password: string;
  confirmPassword: string;
  ttl: number;
  autoStore: boolean;
  tags: string[];
}

export const SecretManager: React.FC<SecretManagerProps> = ({
  onSecretGenerated,
  onSecretSelected,
  className = "",
}) => {
  // 状态管理
  const [activeTab, setActiveTab] = useState<"generate" | "manage" | "import">("generate");
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 秘密列表状态
  const [secrets, setSecrets] = useState<SecretMetadata[]>([]);
  const [selectedSecret, setSelectedSecret] = useState<string | null>(null);

  // 生成选项状态
  const [generateOptions, setGenerateOptions] = useState<SecretGenerationOptions>({
    alias: "",
    purpose: "fusion_swap",
    password: "",
    confirmPassword: "",
    ttl: 24 * 60 * 60 * 1000, // 24小时
    autoStore: true,
    tags: [],
  });

  // 导入选项状态
  const [importPassword, setImportPassword] = useState("");
  const [importData, setImportData] = useState("");

  // 初始化检查
  useEffect(() => {
    setIsSupported(isWebCryptoSupported());
    if (isWebCryptoSupported()) {
      loadSecrets();
    }
  }, []);

  // 加载已存储的秘密列表
  const loadSecrets = useCallback(async () => {
    try {
      const secretList = await secretManager.listSecrets();
      setSecrets(secretList);
    } catch (err) {
      console.error("Failed to load secrets:", err);
    }
  }, []);

  // 清除消息
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // 验证生成选项
  const validateGenerateOptions = (): string | null => {
    if (!generateOptions.alias.trim()) {
      return "Please enter an alias for the secret";
    }
    if (generateOptions.password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (generateOptions.password !== generateOptions.confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  };

  // 生成新秘密
  const handleGenerateSecret = async () => {
    clearMessages();

    const validationError = validateGenerateOptions();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      const result = await secretManager.generateSecret(generateOptions.alias, generateOptions.purpose, {
        password: generateOptions.autoStore ? generateOptions.password : undefined,
        ttl: generateOptions.ttl,
        tags: generateOptions.tags,
      });

      if (result.success) {
        setSuccess(`Secret generated successfully! Key ID: ${result.keyId.substring(0, 8)}...`);

        // 清空表单
        setGenerateOptions({
          alias: "",
          purpose: "fusion_swap",
          password: "",
          confirmPassword: "",
          ttl: 24 * 60 * 60 * 1000,
          autoStore: true,
          tags: [],
        });

        // 重新加载秘密列表
        await loadSecrets();

        // 通知父组件
        if (onSecretGenerated) {
          onSecretGenerated(result.keyId, result.hash);
        }
      } else {
        setError(result.error || "Failed to generate secret");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // 使用已有秘密
  const handleUseSecret = async (keyId: string, requirePassword: boolean = false) => {
    clearMessages();

    if (requirePassword) {
      const password = prompt("Enter password to decrypt secret:");
      if (!password) return;

      setIsLoading(true);
      try {
        const result = await secretManager.getSecret(keyId, password);
        if (result.success && result.hash) {
          setSuccess("Secret loaded successfully!");
          setSelectedSecret(keyId);

          if (onSecretSelected) {
            onSecretSelected(keyId, result.hash);
          }
        } else {
          setError(result.error || "Failed to decrypt secret");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to decrypt secret");
      } finally {
        setIsLoading(false);
      }
    } else {
      // 使用会话中的秘密
      try {
        const result = await secretManager.getSecret(keyId);
        if (result.success && result.hash) {
          setSuccess("Secret selected successfully!");
          setSelectedSecret(keyId);

          if (onSecretSelected) {
            onSecretSelected(keyId, result.hash);
          }
        } else {
          setError("Secret not available in session. Password required.");
        }
      } catch (err) {
        setError("Failed to access secret");
      }
    }
  };

  // 删除秘密
  const handleDeleteSecret = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this secret? This action cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    try {
      const success = await secretManager.removeSecret(keyId);
      if (success) {
        setSuccess("Secret deleted successfully!");
        await loadSecrets();

        if (selectedSecret === keyId) {
          setSelectedSecret(null);
        }
      } else {
        setError("Failed to delete secret");
      }
    } catch (err) {
      setError("Failed to delete secret");
    } finally {
      setIsLoading(false);
    }
  };

  // 清理过期秘密
  const handleCleanup = async () => {
    setIsLoading(true);
    try {
      await secretManager.cleanup();
      setSuccess("Expired secrets cleaned up successfully!");
      await loadSecrets();
    } catch (err) {
      setError("Failed to cleanup expired secrets");
    } finally {
      setIsLoading(false);
    }
  };

  // 格式化时间显示
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // 计算剩余时间
  const getRemainingTime = (expiresAt: number) => {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return "Expired";

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (!isSupported) {
    return (
      <div className={`bg-base-200 rounded-lg p-6 ${className}`}>
        <div className="alert alert-error">
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
          <span>WebCrypto API is not supported in your browser. Secret management is not available.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-base-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">🔐 Client Secret Manager</h2>
        <button onClick={handleCleanup} className="btn btn-outline btn-sm" disabled={isLoading}>
          🧹 Cleanup
        </button>
      </div>

      {/* 错误和成功消息 */}
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
          <button onClick={clearMessages} className="btn btn-sm btn-ghost">
            ✕
          </button>
        </div>
      )}

      {success && (
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
          <span>{success}</span>
          <button onClick={clearMessages} className="btn btn-sm btn-ghost">
            ✕
          </button>
        </div>
      )}

      {/* 选项卡导航 */}
      <div className="tabs tabs-boxed mb-6">
        <button
          onClick={() => setActiveTab("generate")}
          className={`tab ${activeTab === "generate" ? "tab-active" : ""}`}
        >
          ➕ Generate
        </button>
        <button onClick={() => setActiveTab("manage")} className={`tab ${activeTab === "manage" ? "tab-active" : ""}`}>
          📋 Manage ({secrets.length})
        </button>
      </div>

      {/* 生成新秘密 */}
      {activeTab === "generate" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Alias *</span>
              </label>
              <input
                type="text"
                placeholder="e.g., My Swap Secret"
                className="input input-bordered"
                value={generateOptions.alias}
                onChange={e => setGenerateOptions(prev => ({ ...prev, alias: e.target.value }))}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Purpose</span>
              </label>
              <select
                className="select select-bordered"
                value={generateOptions.purpose}
                onChange={e => setGenerateOptions(prev => ({ ...prev, purpose: e.target.value }))}
              >
                <option value="fusion_swap">Fusion Swap</option>
                <option value="cross_chain">Cross-Chain Transfer</option>
                <option value="htlc">HTLC Contract</option>
                <option value="general">General Purpose</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Password *</span>
              </label>
              <input
                type="password"
                placeholder="Minimum 8 characters"
                className="input input-bordered"
                value={generateOptions.password}
                onChange={e => setGenerateOptions(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Confirm Password *</span>
              </label>
              <input
                type="password"
                placeholder="Re-enter password"
                className="input input-bordered"
                value={generateOptions.confirmPassword}
                onChange={e => setGenerateOptions(prev => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Expires In</span>
              </label>
              <select
                className="select select-bordered"
                value={generateOptions.ttl}
                onChange={e => setGenerateOptions(prev => ({ ...prev, ttl: parseInt(e.target.value) }))}
              >
                <option value={1 * 60 * 60 * 1000}>1 Hour</option>
                <option value={6 * 60 * 60 * 1000}>6 Hours</option>
                <option value={24 * 60 * 60 * 1000}>24 Hours</option>
                <option value={7 * 24 * 60 * 60 * 1000}>7 Days</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Auto-Store (Encrypted)</span>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={generateOptions.autoStore}
                  onChange={e => setGenerateOptions(prev => ({ ...prev, autoStore: e.target.checked }))}
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() =>
                setGenerateOptions({
                  alias: "",
                  purpose: "fusion_swap",
                  password: "",
                  confirmPassword: "",
                  ttl: 24 * 60 * 60 * 1000,
                  autoStore: true,
                  tags: [],
                })
              }
              className="btn btn-outline"
              disabled={isLoading}
            >
              Reset
            </button>
            <button
              onClick={handleGenerateSecret}
              className={`btn btn-primary ${isLoading ? "loading" : ""}`}
              disabled={isLoading}
            >
              🔐 Generate Secret
            </button>
          </div>

          <div className="bg-base-100 rounded-lg p-4 mt-4">
            <h3 className="font-semibold mb-2">🛡️ Security Notes</h3>
            <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
              <li>• Secrets are generated using your browser's WebCrypto API</li>
              <li>• Passwords use PBKDF2 with 100,000 iterations for key derivation</li>
              <li>• Encrypted data is stored locally in your browser only</li>
              <li>• Secrets are automatically cleared from memory after use</li>
              <li>• Use strong passwords and do not share them with anyone</li>
            </ul>
          </div>
        </div>
      )}

      {/* 管理已有秘密 */}
      {activeTab === "manage" && (
        <div className="space-y-4">
          {secrets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No secrets found. Generate your first secret to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {secrets.map(secret => (
                <div
                  key={secret.keyId}
                  className={`bg-base-100 rounded-lg p-4 border ${
                    selectedSecret === secret.keyId ? "border-primary" : "border-base-300"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold">{secret.alias}</h3>
                        <span className="badge badge-secondary badge-sm">{secret.purpose}</span>
                        {Date.now() > secret.expiresAt && <span className="badge badge-error badge-sm">Expired</span>}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                          <span className="font-medium">Created:</span> {formatTime(secret.createdAt)}
                        </div>
                        <div>
                          <span className="font-medium">Last Used:</span> {formatTime(secret.lastUsed)}
                        </div>
                        <div>
                          <span className="font-medium">Usage Count:</span> {secret.usageCount}
                        </div>
                        <div>
                          <span className="font-medium">Expires:</span> {getRemainingTime(secret.expiresAt)}
                        </div>
                      </div>

                      <div className="mt-2">
                        <span className="text-xs text-gray-500">ID: {secret.keyId.substring(0, 16)}...</span>
                      </div>
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleUseSecret(secret.keyId, true)}
                        className="btn btn-primary btn-sm"
                        disabled={isLoading || Date.now() > secret.expiresAt}
                      >
                        Use
                      </button>
                      <button
                        onClick={() => handleDeleteSecret(secret.keyId)}
                        className="btn btn-error btn-sm"
                        disabled={isLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={loadSecrets} className="btn btn-outline w-full" disabled={isLoading}>
            🔄 Refresh
          </button>
        </div>
      )}
    </div>
  );
};
