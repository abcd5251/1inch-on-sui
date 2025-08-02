"use client";

import React from "react";

interface WalletInstallGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletInstallGuide: React.FC<WalletInstallGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 p-6 rounded-2xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Install Wallet</h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">For Ethereum (EVM)</h4>
            <p className="text-sm text-base-content/70 mb-3">
              Install MetaMask or another Ethereum wallet to interact with EVM chains.
            </p>
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
            >
              Install MetaMask
            </a>
          </div>
          
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">For Sui</h4>
            <p className="text-sm text-base-content/70 mb-3">
              Install Sui Wallet or Suiet Wallet to interact with the Sui blockchain.
            </p>
            <div className="flex gap-2">
              <a
                href="https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
              >
                Sui Wallet
              </a>
              <a
                href="https://chrome.google.com/webstore/detail/suiet-sui-wallet/khpkpbbcccdmmclmpigdgddabeilkdpd"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                Suiet Wallet
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-base-content/50">
            After installing, refresh this page to connect your wallets.
          </p>
        </div>
      </div>
    </div>
  );
};