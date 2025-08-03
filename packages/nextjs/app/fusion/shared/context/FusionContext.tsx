"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserPreferences {
  theme: 'light' | 'dark';
  defaultNetwork: 'ethereum' | 'sui';
  autoSwitchNetwork: boolean;
  showAdvancedFeatures: boolean;
}

interface FusionContextType {
  selectedNetwork: 'ethereum' | 'sui';
  setSelectedNetwork: (network: 'ethereum' | 'sui') => void;
  userPreferences: UserPreferences;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  isLoading: boolean;
}

const defaultPreferences: UserPreferences = {
  theme: 'light',
  defaultNetwork: 'ethereum',
  autoSwitchNetwork: true,
  showAdvancedFeatures: false,
};

const FusionContext = createContext<FusionContextType | null>(null);

export const FusionProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedNetwork, setSelectedNetwork] = useState<'ethereum' | 'sui'>('ethereum');
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 从localStorage加载用户偏好
  useEffect(() => {
    const savedPreferences = localStorage.getItem('fusion-preferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setUserPreferences({ ...defaultPreferences, ...parsed });
        setSelectedNetwork(parsed.defaultNetwork || 'ethereum');
      } catch (error) {
        console.error('Failed to parse saved preferences:', error);
      }
    }
    setIsLoading(false);
  }, []);

  // 保存用户偏好到localStorage
  const updatePreferences = (newPreferences: Partial<UserPreferences>) => {
    const updated = { ...userPreferences, ...newPreferences };
    setUserPreferences(updated);
    localStorage.setItem('fusion-preferences', JSON.stringify(updated));
  };

  // 智能网络切换
  const handleNetworkChange = (network: 'ethereum' | 'sui') => {
    setSelectedNetwork(network);
    updatePreferences({ defaultNetwork: network });
    
    // 智能路由切换逻辑
    if (userPreferences.autoSwitchNetwork) {
      const currentPath = window.location.pathname;
      if (currentPath.includes('/fusion/')) {
        const pathParts = currentPath.split('/');
        const fusionIndex = pathParts.indexOf('fusion');
        
        if (fusionIndex !== -1 && pathParts[fusionIndex + 1]) {
          const currentSection = pathParts[fusionIndex + 1];
          
          // 如果当前在特定网络页面，切换到对应网络
          if (currentSection === 'ethereum' || currentSection === 'sui') {
            const newPath = currentPath.replace(
              `/fusion/${currentSection}/`,
              `/fusion/${network}/`
            );
            router.push(newPath);
          }
        }
      }
    }
  };

  const contextValue: FusionContextType = {
    selectedNetwork,
    setSelectedNetwork: handleNetworkChange,
    userPreferences,
    updatePreferences,
    isLoading,
  };

  return (
    <FusionContext.Provider value={contextValue}>
      {children}
    </FusionContext.Provider>
  );
};

export const useFusion = () => {
  const context = useContext(FusionContext);
  if (!context) {
    throw new Error('useFusion must be used within a FusionProvider');
  }
  return context;
};