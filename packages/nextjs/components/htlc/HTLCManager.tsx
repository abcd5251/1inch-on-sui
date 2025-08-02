"use client";

import { useCallback, useEffect, useState } from "react";
import { bcs } from "@mysten/sui/bcs";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Contract } from "ethers";
import { formatEther, parseEther } from "viem";
import { useEthersSigner } from "~~/hooks/scaffold-eth/useEthersSigner";
import { useSuiWallet } from "~~/hooks/sui/useSuiWallet";

// HTLC Contract ABI (key functions only)
const HTLC_ABI = [
  "function newContract(address _receiver, bytes32 _hashlock, uint256 _timelock, address _tokenContract, uint256 _amount, uint256 _targetChainId) external payable returns (bytes32 contractId)",
  "function withdraw(bytes32 _contractId, bytes32 _preimage) external",
  "function refund(bytes32 _contractId) external",
  "function getContract(bytes32 _contractId) external view returns (tuple(address sender, address receiver, address tokenContract, uint256 amount, bytes32 hashlock, uint256 timelock, bool withdrawn, bool refunded, bytes32 preimage, uint256 targetChainId))",
  "function haveContract(bytes32 _contractId) external view returns (bool exists)",
  "function canWithdraw(bytes32 _contractId) external view returns (bool canWithdraw)",
  "function canRefund(bytes32 _contractId) external view returns (bool canRefund)",
  "event HTLCDeposit(bytes32 indexed contractId, address indexed sender, address indexed receiver, address tokenContract, uint256 amount, bytes32 hashlock, uint256 timelock, uint256 chainId)",
  "event HTLCWithdraw(bytes32 indexed contractId, bytes32 preimage)",
  "event HTLCRefund(bytes32 indexed contractId)",
];

interface HTLCContract {
  id: string;
  sender: string;
  receiver: string;
  tokenContract: string;
  amount: string;
  hashlock: string;
  timelock: number;
  withdrawn: boolean;
  refunded: boolean;
  preimage?: string;
  targetChainId: string;
  chain: "ethereum" | "sui";
  status: "active" | "withdrawn" | "refunded" | "expired";
  createdAt: number;
}

interface HTLCManagerProps {
  className?: string;
}

export const HTLCManager = ({ className = "" }: HTLCManagerProps) => {
  const signer = useEthersSigner();
  const { wallet, account, signAndExecuteTransaction } = useSuiWallet();

  const [activeTab, setActiveTab] = useState<"create" | "manage" | "history">("create");
  const [htlcContracts, setHtlcContracts] = useState<HTLCContract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // HTLC Contract addresses - Update these after deployment
  // TODO: Deploy HTLC.sol to Ethereum and update this address
  const HTLC_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // Ethereum HTLC contract
  // TODO: Deploy sui_fusion_protocol package to Sui and update this package ID
  const SUI_PACKAGE_ID = "0x0000000000000000000000000000000000000000000000000000000000000000"; // Sui package ID

  // Form states
  const [newHTLC, setNewHTLC] = useState({
    chain: "ethereum" as "ethereum" | "sui",
    receiver: "",
    amount: "",
    secret: "",
    hashlock: "",
    timeoutHours: "24",
    tokenContract: "0x0000000000000000000000000000000000000000", // ETH
  });

  // Clear messages
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  // Generate SHA256 hash of secret
  const generateHashlock = useCallback(async (secret: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(secret);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return "0x" + hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }, []);

  // Update hashlock when secret changes
  useEffect(() => {
    if (newHTLC.secret) {
      generateHashlock(newHTLC.secret).then(hashlock => {
        setNewHTLC(prev => ({ ...prev, hashlock }));
      });
    }
  }, [newHTLC.secret, generateHashlock]);

  // Create HTLC on Ethereum
  const createEthereumHTLC = async () => {
    if (!signer) throw new Error("Ethereum wallet not connected");

    const contract = new Contract(HTLC_CONTRACT_ADDRESS, HTLC_ABI, signer);
    const timelock = Math.floor(Date.now() / 1000) + parseInt(newHTLC.timeoutHours) * 3600;
    const amount = parseEther(newHTLC.amount);

    const tx = await contract.newContract(
      newHTLC.receiver,
      newHTLC.hashlock,
      timelock,
      newHTLC.tokenContract,
      amount,
      101, // SUI_CHAIN_ID
      { value: newHTLC.tokenContract === "0x0000000000000000000000000000000000000000" ? amount : 0 },
    );

    const receipt = await tx.wait();
    const event = receipt.events?.find((e: any) => e.event === "HTLCDeposit");

    return {
      contractId: event?.args?.contractId,
      transactionHash: receipt.transactionHash,
    };
  };

  // Create HTLC on Sui
  const createSuiHTLC = async () => {
    if (!wallet || !account) throw new Error("Sui wallet not connected");

    const txb = new Transaction();

    // Split coins for the amount
    const [coin] = txb.splitCoins(txb.gas, [txb.pure.u64(BigInt(parseFloat(newHTLC.amount) * 1e9))]);

    // Convert secret to bytes
    const secretBytes = new Uint8Array(new TextEncoder().encode(newHTLC.secret));

    txb.moveCall({
      target: `${SUI_PACKAGE_ID}::atomic_swap_lock::create_fusion_lock`,
      typeArguments: ["0x2::sui::SUI"],
      arguments: [
        txb.pure(secretBytes),
        txb.pure.u64(parseInt(newHTLC.timeoutHours)),
        coin,
        txb.pure.address(newHTLC.receiver),
        txb.object("0x6"), // Clock object
      ],
    });

    const result = await signAndExecuteTransaction({
      transaction: txb,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    return {
      contractId: result.digest,
      transactionHash: result.digest,
    };
  };

  // Create HTLC
  const handleCreateHTLC = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!newHTLC.receiver || !newHTLC.amount || !newHTLC.secret) {
      setError("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      let result;

      if (newHTLC.chain === "ethereum") {
        result = await createEthereumHTLC();
      } else {
        result = await createSuiHTLC();
      }

      setSuccess(`HTLC created successfully! Contract ID: ${result.contractId}`);

      // Add to local state
      const newContract: HTLCContract = {
        id: result.contractId,
        sender: newHTLC.chain === "ethereum" ? (await signer?.getAddress()) || "" : account?.address || "",
        receiver: newHTLC.receiver,
        tokenContract: newHTLC.tokenContract,
        amount: newHTLC.amount,
        hashlock: newHTLC.hashlock,
        timelock: Math.floor(Date.now() / 1000) + parseInt(newHTLC.timeoutHours) * 3600,
        withdrawn: false,
        refunded: false,
        targetChainId: newHTLC.chain === "ethereum" ? "101" : "1",
        chain: newHTLC.chain,
        status: "active",
        createdAt: Date.now(),
      };

      setHtlcContracts(prev => [newContract, ...prev]);

      // Reset form
      setNewHTLC({
        ...newHTLC,
        receiver: "",
        amount: "",
        secret: "",
        hashlock: "",
      });

      // Switch to manage tab
      setActiveTab("manage");
    } catch (error) {
      console.error("Failed to create HTLC:", error);
      setError(error instanceof Error ? error.message : "Failed to create HTLC");
    } finally {
      setIsLoading(false);
    }
  };

  // Withdraw from HTLC
  const handleWithdraw = async (contractId: string, secret: string, chain: "ethereum" | "sui") => {
    setIsLoading(true);
    clearMessages();

    try {
      if (chain === "ethereum") {
        if (!signer) throw new Error("Ethereum wallet not connected");

        const contract = new Contract(HTLC_CONTRACT_ADDRESS, HTLC_ABI, signer);
        const hashlock = await generateHashlock(secret);

        const tx = await contract.withdraw(contractId, hashlock);
        await tx.wait();

        setSuccess("Successfully withdrew from Ethereum HTLC!");
      } else {
        if (!wallet || !account) throw new Error("Sui wallet not connected");

        const txb = new Transaction();
        const secretBytes = new Uint8Array(new TextEncoder().encode(secret));

        txb.moveCall({
          target: `${SUI_PACKAGE_ID}::atomic_swap_lock::unlock_with_secret`,
          typeArguments: ["0x2::sui::SUI"],
          arguments: [
            txb.object(contractId),
            txb.pure(secretBytes),
            txb.object("0x6"), // Clock object
          ],
        });

        await signAndExecuteTransaction({
          transaction: txb,
          options: {
            showEffects: true,
          },
        });

        setSuccess("Successfully withdrew from Sui HTLC!");
      }

      // Update local state
      setHtlcContracts(prev =>
        prev.map(contract =>
          contract.id === contractId ? { ...contract, status: "withdrawn" as const, withdrawn: true } : contract,
        ),
      );
    } catch (error) {
      console.error("Failed to withdraw:", error);
      setError(error instanceof Error ? error.message : "Failed to withdraw from HTLC");
    } finally {
      setIsLoading(false);
    }
  };

  // Refund HTLC
  const handleRefund = async (contractId: string, chain: "ethereum" | "sui") => {
    setIsLoading(true);
    clearMessages();

    try {
      if (chain === "ethereum") {
        if (!signer) throw new Error("Ethereum wallet not connected");

        const contract = new Contract(HTLC_CONTRACT_ADDRESS, HTLC_ABI, signer);
        const tx = await contract.refund(contractId);
        await tx.wait();

        setSuccess("Successfully refunded Ethereum HTLC!");
      } else {
        if (!wallet || !account) throw new Error("Sui wallet not connected");

        const txb = new Transaction();

        txb.moveCall({
          target: `${SUI_PACKAGE_ID}::atomic_swap_lock::timeout_refund`,
          typeArguments: ["0x2::sui::SUI"],
          arguments: [
            txb.object(contractId),
            txb.object("0x6"), // Clock object
          ],
        });

        await signAndExecuteTransaction({
          transaction: txb,
          options: {
            showEffects: true,
          },
        });

        setSuccess("Successfully refunded Sui HTLC!");
      }

      // Update local state
      setHtlcContracts(prev =>
        prev.map(contract =>
          contract.id === contractId ? { ...contract, status: "refunded" as const, refunded: true } : contract,
        ),
      );
    } catch (error) {
      console.error("Failed to refund:", error);
      setError(error instanceof Error ? error.message : "Failed to refund HTLC");
    } finally {
      setIsLoading(false);
    }
  };

  // Format time remaining
  const formatTimeRemaining = (timelock: number) => {
    const remaining = timelock * 1000 - Date.now();
    if (remaining <= 0) return "Expired";

    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Get status color
  const getStatusColor = (status: HTLCContract["status"]) => {
    switch (status) {
      case "active":
        return "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900";
      case "withdrawn":
        return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900";
      case "refunded":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900";
      case "expired":
        return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900";
    }
  };

  // Get chain icon
  const getChainIcon = (chain: "ethereum" | "sui") => {
    return chain === "sui" ? (
      <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-bold">S</span>
      </div>
    ) : (
      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-bold">Ξ</span>
      </div>
    );
  };

  return (
    <div className={`bg-base-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">HTLC Manager</h2>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${signer || wallet ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
          ></div>
          <span className="text-sm">{signer || wallet ? "Connected" : "Not Connected"}</span>
        </div>
      </div>

      {/* Connection Warning */}
      {!signer && !wallet && (
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
          <span>Connect an Ethereum or Sui wallet to manage HTLCs</span>
        </div>
      )}

      {/* Success Message */}
      {success && (
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
            <div className="text-sm">{success}</div>
          </div>
          <button onClick={clearMessages} className="btn btn-ghost btn-sm">
            ×
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
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
            <div className="text-sm">{error}</div>
          </div>
          <button onClick={clearMessages} className="btn btn-ghost btn-sm">
            ×
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tabs tabs-boxed mb-6">
        {[
          { key: "create", label: "Create HTLC" },
          { key: "manage", label: "Manage HTLCs" },
          { key: "history", label: "History" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`tab ${activeTab === key ? "tab-active" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Create HTLC Tab */}
      {activeTab === "create" && (
        <form onSubmit={handleCreateHTLC} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chain Selection */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Blockchain</span>
              </label>
              <div className="flex items-center gap-4">
                <label className="label cursor-pointer">
                  <input
                    type="radio"
                    name="chain"
                    value="ethereum"
                    checked={newHTLC.chain === "ethereum"}
                    onChange={e => setNewHTLC(prev => ({ ...prev, chain: e.target.value as any }))}
                    className="radio radio-primary"
                  />
                  <span className="label-text ml-2 flex items-center gap-2">{getChainIcon("ethereum")} Ethereum</span>
                </label>
                <label className="label cursor-pointer">
                  <input
                    type="radio"
                    name="chain"
                    value="sui"
                    checked={newHTLC.chain === "sui"}
                    onChange={e => setNewHTLC(prev => ({ ...prev, chain: e.target.value as any }))}
                    className="radio radio-primary"
                  />
                  <span className="label-text ml-2 flex items-center gap-2">{getChainIcon("sui")} Sui</span>
                </label>
              </div>
            </div>

            {/* Timeout Hours */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Timeout Hours</span>
              </label>
              <select
                value={newHTLC.timeoutHours}
                onChange={e => setNewHTLC(prev => ({ ...prev, timeoutHours: e.target.value }))}
                className="select select-bordered"
              >
                <option value="1">1 Hour</option>
                <option value="6">6 Hours</option>
                <option value="12">12 Hours</option>
                <option value="24">24 Hours</option>
                <option value="48">48 Hours</option>
                <option value="168">1 Week</option>
              </select>
            </div>
          </div>

          {/* Receiver Address */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Receiver Address</span>
            </label>
            <input
              type="text"
              placeholder={newHTLC.chain === "ethereum" ? "0x..." : "0x..."}
              value={newHTLC.receiver}
              onChange={e => setNewHTLC(prev => ({ ...prev, receiver: e.target.value }))}
              className="input input-bordered"
              required
            />
          </div>

          {/* Amount */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Amount ({newHTLC.chain === "ethereum" ? "ETH" : "SUI"})</span>
            </label>
            <input
              type="number"
              step="0.001"
              placeholder="0.0"
              value={newHTLC.amount}
              onChange={e => setNewHTLC(prev => ({ ...prev, amount: e.target.value }))}
              className="input input-bordered"
              required
            />
          </div>

          {/* Secret */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Secret</span>
              <span className="label-text-alt">Keep this secret safe!</span>
            </label>
            <input
              type="password"
              placeholder="Enter a secret phrase..."
              value={newHTLC.secret}
              onChange={e => setNewHTLC(prev => ({ ...prev, secret: e.target.value }))}
              className="input input-bordered"
              required
            />
          </div>

          {/* Generated Hashlock */}
          {newHTLC.hashlock && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">Generated Hashlock</span>
              </label>
              <input type="text" value={newHTLC.hashlock} className="input input-bordered font-mono" readOnly />
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button type="submit" disabled={isLoading || (!signer && !wallet)} className="btn btn-primary">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="loading loading-spinner loading-sm"></div>
                  Creating...
                </div>
              ) : (
                "Create HTLC"
              )}
            </button>
          </div>
        </form>
      )}

      {/* Manage HTLCs Tab */}
      {activeTab === "manage" && (
        <div className="space-y-4">
          {htlcContracts
            .filter(contract => contract.status === "active")
            .map(contract => (
              <div key={contract.id} className="bg-base-100 rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getChainIcon(contract.chain)}
                    <div>
                      <div className="font-medium">
                        {contract.amount} {contract.chain === "ethereum" ? "ETH" : "SUI"}
                      </div>
                      <div className="text-sm text-gray-500">To: {contract.receiver.slice(0, 10)}...</div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(contract.status)}`}>
                    {contract.status.toUpperCase()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <div className="font-medium text-gray-500">Contract ID</div>
                    <div className="font-mono">{contract.id.slice(0, 20)}...</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-500">Time Remaining</div>
                    <div className="font-mono">{formatTimeRemaining(contract.timelock)}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-500">Created</div>
                    <div>{new Date(contract.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      const secret = prompt("Enter the secret to withdraw:");
                      if (secret) {
                        handleWithdraw(contract.id, secret, contract.chain);
                      }
                    }}
                    className="btn btn-success btn-sm"
                    disabled={isLoading}
                  >
                    Withdraw
                  </button>
                  <button
                    onClick={() => handleRefund(contract.id, contract.chain)}
                    className="btn btn-error btn-sm"
                    disabled={isLoading}
                  >
                    Refund
                  </button>
                </div>
              </div>
            ))}

          {htlcContracts.filter(contract => contract.status === "active").length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">🔒</div>
              <div className="text-lg font-medium mb-2">No active HTLCs</div>
              <div className="text-sm">Create an HTLC to see it here</div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {htlcContracts.map(contract => (
            <div key={contract.id} className="bg-base-100 rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {getChainIcon(contract.chain)}
                  <div>
                    <div className="font-medium">
                      {contract.amount} {contract.chain === "ethereum" ? "ETH" : "SUI"}
                    </div>
                    <div className="text-sm text-gray-500">To: {contract.receiver.slice(0, 10)}...</div>
                  </div>
                </div>
                <div className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(contract.status)}`}>
                  {contract.status.toUpperCase()}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {new Date(contract.createdAt).toLocaleDateString()} {new Date(contract.createdAt).toLocaleTimeString()}
              </div>
            </div>
          ))}

          {htlcContracts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">📜</div>
              <div className="text-lg font-medium mb-2">No HTLC history</div>
              <div className="text-sm">Your created HTLCs will appear here</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
