"use client";

import React, { useState, useEffect } from "react";
import type { NextPage } from "next";
import Link from "next/link";
import { PresetEnum } from "@1inch/fusion-sdk/api";
import { useAccount } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";
import { Address } from "~~/components/scaffold-eth";

interface FusionSettings {
  defaultPreset: PresetEnum;
  slippageTolerance: number;
  gasPrice: 'auto' | 'fast' | 'standard' | 'slow';
  enableNotifications: boolean;
  autoRefreshOrders: boolean;
  refreshInterval: number;
  maxOrderDuration: number;
  preferredTokens: string[];
}

const defaultSettings: FusionSettings = {
  defaultPreset: PresetEnum.fast,
  slippageTolerance: 0.5,
  gasPrice: 'auto',
  enableNotifications: true,
  autoRefreshOrders: true,
  refreshInterval: 30,
  maxOrderDuration: 3600,
  preferredTokens: ['ETH', 'USDC', 'WETH', '1INCH'],
};

const FusionSettingsPage: NextPage = () => {
  const { address } = useAccount();
  const [settings, setSettings] = useState<FusionSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('fusion-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  const updateSetting = <K extends keyof FusionSettings>(
    key: K,
    value: FusionSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('fusion-settings', JSON.stringify(settings));
      setHasChanges(false);
      notification.success('Settings saved successfully');
    } catch (error) {
      notification.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  const addPreferredToken = () => {
    const token = prompt('Enter token symbol (e.g., DAI):');
    if (token && !settings.preferredTokens.includes(token.toUpperCase())) {
      updateSetting('preferredTokens', [...settings.preferredTokens, token.toUpperCase()]);
    }
  };

  const removePreferredToken = (token: string) => {
    updateSetting('preferredTokens', settings.preferredTokens.filter(t => t !== token));
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="breadcrumbs text-sm mb-6">
          <ul>
            <li>
              <Link href="/" className="link link-hover">
                Home
              </Link>
            </li>
            <li>
              <Link href="/fusion" className="link link-hover">
                Fusion
              </Link>
            </li>
            <li>Settings</li>
          </ul>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Fusion Settings
            </span>
          </h1>
          <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
            Customize your 1inch Fusion trading experience with personalized settings.
          </p>
        </div>

        {/* Wallet Status */}
        <div className="bg-base-200 p-4 rounded-lg mb-6">
          <div className="text-sm font-medium mb-2">Connected Wallet:</div>
          {address ? (
            <Address address={address} />
          ) : (
            <div className="text-warning">Please connect your wallet</div>
          )}
        </div>

        {/* Settings Form */}
        <div className="space-y-6">
          {/* Trading Preferences */}
          <div className="bg-base-200 p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-4">Trading Preferences</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Default Preset */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Default Order Preset</span>
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={settings.defaultPreset}
                  onChange={(e) => updateSetting('defaultPreset', e.target.value as PresetEnum)}
                >
                  <option value={PresetEnum.fast}>Fast (Higher fees, faster execution)</option>
                  <option value={PresetEnum.medium}>Medium (Balanced)</option>
                  <option value={PresetEnum.slow}>Slow (Lower fees, slower execution)</option>
                </select>
              </div>

              {/* Slippage Tolerance */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Slippage Tolerance (%)</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={settings.slippageTolerance}
                  onChange={(e) => updateSetting('slippageTolerance', parseFloat(e.target.value))}
                  min="0.1"
                  max="50"
                  step="0.1"
                />
              </div>

              {/* Gas Price Strategy */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Gas Price Strategy</span>
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={settings.gasPrice}
                  onChange={(e) => updateSetting('gasPrice', e.target.value as FusionSettings['gasPrice'])}
                >
                  <option value="auto">Auto (Recommended)</option>
                  <option value="fast">Fast (Higher gas fees)</option>
                  <option value="standard">Standard</option>
                  <option value="slow">Slow (Lower gas fees)</option>
                </select>
              </div>

              {/* Max Order Duration */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Max Order Duration (seconds)</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={settings.maxOrderDuration}
                  onChange={(e) => updateSetting('maxOrderDuration', parseInt(e.target.value))}
                  min="300"
                  max="86400"
                  step="300"
                />
                <label className="label">
                  <span className="label-text-alt">Current: {Math.floor(settings.maxOrderDuration / 60)} minutes</span>
                </label>
              </div>
            </div>
          </div>

          {/* Interface Settings */}
          <div className="bg-base-200 p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-4">Interface Settings</h2>
            
            <div className="space-y-4">
              {/* Enable Notifications */}
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text font-medium">Enable Notifications</span>
                  <input 
                    type="checkbox" 
                    className="toggle toggle-primary"
                    checked={settings.enableNotifications}
                    onChange={(e) => updateSetting('enableNotifications', e.target.checked)}
                  />
                </label>
                <label className="label">
                  <span className="label-text-alt">Get notified about order status changes</span>
                </label>
              </div>

              {/* Auto Refresh Orders */}
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text font-medium">Auto Refresh Orders</span>
                  <input 
                    type="checkbox" 
                    className="toggle toggle-primary"
                    checked={settings.autoRefreshOrders}
                    onChange={(e) => updateSetting('autoRefreshOrders', e.target.checked)}
                  />
                </label>
                <label className="label">
                  <span className="label-text-alt">Automatically refresh order status</span>
                </label>
              </div>

              {/* Refresh Interval */}
              {settings.autoRefreshOrders && (
                <div className="form-control ml-6">
                  <label className="label">
                    <span className="label-text font-medium">Refresh Interval (seconds)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered w-full max-w-xs"
                    value={settings.refreshInterval}
                    onChange={(e) => updateSetting('refreshInterval', parseInt(e.target.value))}
                    min="10"
                    max="300"
                    step="10"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Preferred Tokens */}
          <div className="bg-base-200 p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-4">Preferred Tokens</h2>
            <p className="text-sm text-base-content/70 mb-4">
              Add tokens that you frequently trade to have them appear first in token selection.
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {settings.preferredTokens.map((token) => (
                <div key={token} className="badge badge-primary gap-2">
                  {token}
                  <button 
                    className="btn btn-xs btn-circle btn-ghost"
                    onClick={() => removePreferredToken(token)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            
            <button 
              className="btn btn-outline btn-sm"
              onClick={addPreferredToken}
            >
              + Add Token
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center pt-6">
            <button 
              className="btn btn-primary"
              onClick={saveSettings}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
            
            <button 
              className="btn btn-outline"
              onClick={resetSettings}
            >
              Reset to Defaults
            </button>
            
            <Link href="/fusion" className="btn btn-ghost">
              Back to Fusion
            </Link>
          </div>
        </div>

        {/* Settings Info */}
        <div className="mt-8 alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h3 className="font-bold">Settings Information</h3>
            <div className="text-sm">
              Settings are stored locally in your browser. You may need to reconfigure them if you clear your browser data or use a different device.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FusionSettingsPage;