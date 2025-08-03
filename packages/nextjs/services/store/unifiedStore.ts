import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import { useMemo } from 'react';
import { ChainWithAttributes, NETWORKS_EXTRA_DATA } from '~~/utils/scaffold-eth';
import scaffoldConfig from '~~/scaffold.config';
import type {
  Balance,
  Quote,
  Order,
  FusionOrder,
  AuctionDetails,
  NetworkInfo,
  OrderFilters,
} from '@1inch/sui-fusion-sdk';

// ==================== Type Definitions ====================

export type NetworkType = 'ethereum' | 'sui' | 'cross-chain';
export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ThemeType = 'light' | 'dark' | 'system';

export interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI?: string;
  balance?: string;
  usdPrice?: number;
}

export interface WalletState {
  address: string | null;
  status: WalletStatus;
  chainId?: number;
  balance?: string;
  isConnecting: boolean;
  error?: string;
}

export interface UserPreferences {
  theme: ThemeType;
  defaultNetwork: NetworkType;
  autoSwitchNetwork: boolean;
  showAdvancedFeatures: boolean;
  language: string;
  slippageTolerance: number;
  transactionDeadline: number; // minutes
  enableNotifications: boolean;
  preferredCurrency: string; // USD, EUR, etc.
}

export interface SwapFormData {
  fromToken: TokenInfo | null;
  toToken: TokenInfo | null;
  amount: string;
  slippage: number;
  deadline: number;
  isReversed: boolean;
}

export interface SwapState {
  formData: SwapFormData;
  quote: Quote | null;
  isLoadingQuote: boolean;
  estimatedOutput: string;
  priceImpact: number;
  minimumReceived: string;
  tradingFee: string;
  networkFee: string;
  isExecuting: boolean;
  lastUpdated: number;
  error?: string;
}

export interface CrossChainBalances {
  ethereum: Record<string, Balance>;
  sui: Record<string, Balance>;
  totalUSD: number;
  lastUpdated: number;
  isRefreshing: boolean;
}

export interface AuctionMonitoringState {
  activeAuctions: AuctionDetails[];
  monitoredAuctionIds: string[];
  auctionUpdates: Record<string, AuctionDetails>;
  isMonitoring: boolean;
  lastUpdate: number;
  notifications: AuctionNotification[];
}

export interface AuctionNotification {
  id: string;
  auctionId: string;
  type: 'bid_placed' | 'auction_won' | 'auction_ended' | 'price_alert';
  message: string;
  timestamp: number;
  isRead: boolean;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempts: number;
  lastPing: number;
  subscriptions: string[];
  error?: string;
}

export interface OrdersState {
  activeOrders: Order[];
  historicalOrders: Order[];
  fusionOrders: FusionOrder[];
  filters: OrderFilters;
  isLoading: boolean;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface UIState {
  selectedNetwork: NetworkType;
  isLoading: boolean;
  showMobileMenu: boolean;
  activeModal: string | null;
  toastNotifications: ToastNotification[];
  sidebarCollapsed: boolean;
  lastActivity: number;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  duration?: number;
  isVisible: boolean;
}

// ==================== Main Store Interface ====================

export interface UnifiedStoreState {
  // Legacy state (for compatibility)
  nativeCurrency: {
    price: number;
    isFetching: boolean;
  };
  targetNetwork: ChainWithAttributes;

  // User preferences and settings
  userPreferences: UserPreferences;
  
  // Wallet states
  wallets: {
    ethereum: WalletState;
    sui: WalletState;
  };

  // UI state
  ui: UIState;

  // Swap state
  swap: SwapState;

  // Cross-chain balances
  balances: CrossChainBalances;

  // Auction monitoring
  auctions: AuctionMonitoringState;

  // WebSocket connection
  websocket: WebSocketState;

  // Orders management
  orders: OrdersState;

  // Demo state
  demo: DemoState;

  // Computed values
  isAnyWalletConnected: boolean;
  totalPortfolioValue: number;
  currentNetworkWallet: WalletState;
}

// ==================== Actions Interface ====================

export interface UnifiedStoreActions {
  // Legacy actions (for compatibility)
  setNativeCurrencyPrice: (price: number) => void;
  setIsNativeCurrencyFetching: (isFetching: boolean) => void;
  setTargetNetwork: (network: ChainWithAttributes) => void;

  // User preferences
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  resetPreferences: () => void;

  // Network management
  setSelectedNetwork: (network: NetworkType) => void;
  switchToNetwork: (network: NetworkType) => void;

  // Wallet management
  updateWalletState: (network: 'ethereum' | 'sui', state: Partial<WalletState>) => void;
  connectWallet: (network: 'ethereum' | 'sui', address: string) => void;
  disconnectWallet: (network: 'ethereum' | 'sui') => void;
  setWalletError: (network: 'ethereum' | 'sui', error: string) => void;

  // Swap form management
  updateSwapForm: (data: Partial<SwapFormData>) => void;
  setSwapQuote: (quote: Quote | null) => void;
  setSwapLoading: (isLoading: boolean) => void;
  swapTokens: () => void;
  resetSwapForm: () => void;
  setSwapError: (error: string | undefined) => void;

  // Balance management
  updateBalances: (network: 'ethereum' | 'sui', balances: Record<string, Balance>) => void;
  refreshBalances: (force?: boolean) => Promise<void>;
  setBalancesRefreshing: (isRefreshing: boolean) => void;

  // Auction monitoring
  addAuctionToMonitor: (auctionId: string) => void;
  removeAuctionFromMonitor: (auctionId: string) => void;
  updateAuctionDetails: (auctionId: string, details: AuctionDetails) => void;
  addAuctionNotification: (notification: Omit<AuctionNotification, 'id' | 'timestamp'>) => void;
  markNotificationAsRead: (notificationId: string) => void;
  clearNotifications: () => void;

  // WebSocket management
  setWebSocketConnected: (isConnected: boolean) => void;
  setWebSocketError: (error: string | undefined) => void;
  addWebSocketSubscription: (subscription: string) => void;
  removeWebSocketSubscription: (subscription: string) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;

  // Orders management
  updateOrders: (orders: Partial<OrdersState>) => void;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: string) => void;
  setOrderFilters: (filters: Partial<OrderFilters>) => void;

  // Demo mode management
  toggleDemoMode: () => void;
  updateDemoConfig: (config: Partial<DemoState>) => void;
  resetDemoState: () => void;
  generateMockData: () => void;

  // UI management
  setLoading: (isLoading: boolean) => void;
  toggleMobileMenu: () => void;
  setActiveModal: (modal: string | null) => void;
  addToastNotification: (notification: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  removeToastNotification: (id: string) => void;
  toggleSidebar: () => void;
  updateActivity: () => void;

  // Utility actions
  resetStore: () => void;
  hydrate: () => void;
}

// ==================== Default Values ====================

const defaultUserPreferences: UserPreferences = {
  theme: 'light',
  defaultNetwork: 'ethereum',
  autoSwitchNetwork: true,
  showAdvancedFeatures: false,
  language: 'en',
  slippageTolerance: 0.5,
  transactionDeadline: 20,
  enableNotifications: true,
  preferredCurrency: 'USD',
};

const defaultWalletState: WalletState = {
  address: null,
  status: 'disconnected',
  chainId: undefined,
  balance: undefined,
  isConnecting: false,
  error: undefined,
};

const defaultSwapFormData: SwapFormData = {
  fromToken: null,
  toToken: null,
  amount: '',
  slippage: 0.5,
  deadline: 20,
  isReversed: false,
};

// ==================== Store Implementation ====================

export const useUnifiedStore = create<UnifiedStoreState & UnifiedStoreActions>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // =============== State ===============
        
        // Legacy state
        nativeCurrency: {
          price: 0,
          isFetching: true,
        },
        targetNetwork: {
          ...scaffoldConfig.targetNetworks[0],
          ...NETWORKS_EXTRA_DATA[scaffoldConfig.targetNetworks[0].id],
        },

        // User preferences
        userPreferences: defaultUserPreferences,

        // Wallet states
        wallets: {
          ethereum: { ...defaultWalletState },
          sui: { ...defaultWalletState },
        },

        // UI state
        ui: {
          selectedNetwork: 'ethereum',
          isLoading: false,
          showMobileMenu: false,
          activeModal: null,
          toastNotifications: [],
          sidebarCollapsed: false,
          lastActivity: Date.now(),
        },

        // Swap state
        swap: {
          formData: { ...defaultSwapFormData },
          quote: null,
          isLoadingQuote: false,
          estimatedOutput: '',
          priceImpact: 0,
          minimumReceived: '',
          tradingFee: '',
          networkFee: '',
          isExecuting: false,
          lastUpdated: 0,
          error: undefined,
        },

        // Cross-chain balances
        balances: {
          ethereum: {},
          sui: {},
          totalUSD: 0,
          lastUpdated: 0,
          isRefreshing: false,
        },

        // Auction monitoring
        auctions: {
          activeAuctions: [
            // Mock active auction for demo
            {
              auctionId: 'demo_auction_1',
              startTime: Date.now() - 30000, // 30 seconds ago
              endTime: Date.now() + 30000, // 30 seconds remaining  
              duration: 60,
              startRate: '3.78',
              endRate: '3.24',
              currentRate: '3.60',
              priceDecayFunction: 'linear',
              tokenPair: 'SUI/USDC',
              status: 'active',
            },
            {
              auctionId: 'demo_auction_2', 
              startTime: Date.now() - 45000, // 45 seconds ago
              endTime: Date.now() + 15000, // 15 seconds remaining
              duration: 60,
              startRate: '0.9998',
              endRate: '0.9995', 
              currentRate: '0.99965',
              priceDecayFunction: 'linear',
              tokenPair: 'USDC-ETH/USDC-SUI',
              status: 'active',
            }
          ],
          monitoredAuctionIds: ['demo_auction_1', 'demo_auction_2'],
          auctionUpdates: {},
          isMonitoring: true,
          lastUpdate: Date.now(),
          notifications: [
            {
              id: 'notif_1',
              auctionId: 'demo_auction_1',
              type: 'bid_placed',
              message: 'New bid: 3.62 SUI/USDC',
              timestamp: Date.now() - 15000,
              isRead: false,
            }
          ],
        },

        // WebSocket state
        websocket: {
          isConnected: false,
          isConnecting: false,
          reconnectAttempts: 0,
          lastPing: 0,
          subscriptions: [],
          error: undefined,
        },

        // Orders state
        orders: {
          activeOrders: [],
          historicalOrders: [],
          fusionOrders: [],
          filters: {},
          isLoading: false,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 20,
          },
        },

        // Demo state
        demo: { ...defaultDemoState },

        // Computed values
        get isAnyWalletConnected() {
          const state = get();
          return (
            state.wallets.ethereum.status === 'connected' ||
            state.wallets.sui.status === 'connected'
          );
        },

        get totalPortfolioValue() {
          const state = get();
          return state.balances.totalUSD;
        },

        get currentNetworkWallet() {
          const state = get();
          const selectedNetwork = state.ui.selectedNetwork;
          if (selectedNetwork === 'ethereum') {
            return state.wallets.ethereum;
          } else if (selectedNetwork === 'sui') {
            return state.wallets.sui;
          }
          // For cross-chain, return the primary wallet or both
          return state.wallets.ethereum.status === 'connected'
            ? state.wallets.ethereum
            : state.wallets.sui;
        },

        // =============== Actions ===============

        // Legacy actions (for compatibility)
        setNativeCurrencyPrice: (price: number) =>
          set(state => ({
            nativeCurrency: { ...state.nativeCurrency, price }
          })),

        setIsNativeCurrencyFetching: (isFetching: boolean) =>
          set(state => ({
            nativeCurrency: { ...state.nativeCurrency, isFetching }
          })),

        setTargetNetwork: (network: ChainWithAttributes) =>
          set(() => ({ targetNetwork: network })),

        // User preferences
        updatePreferences: (preferences: Partial<UserPreferences>) =>
          set(state => ({
            userPreferences: { ...state.userPreferences, ...preferences }
          })),

        resetPreferences: () =>
          set(() => ({ userPreferences: { ...defaultUserPreferences } })),

        // Network management
        setSelectedNetwork: (network: NetworkType) =>
          set(state => ({
            ui: { ...state.ui, selectedNetwork: network }
          })),

        switchToNetwork: (network: NetworkType) => {
          const state = get();
          state.setSelectedNetwork(network);
          state.updatePreferences({ defaultNetwork: network });
          state.updateActivity();
        },

        // Wallet management
        updateWalletState: (network: 'ethereum' | 'sui', walletState: Partial<WalletState>) =>
          set(state => ({
            wallets: {
              ...state.wallets,
              [network]: { ...state.wallets[network], ...walletState }
            }
          })),

        connectWallet: (network: 'ethereum' | 'sui', address: string) => {
          const actions = get();
          actions.updateWalletState(network, {
            address,
            status: 'connected',
            isConnecting: false,
            error: undefined,
          });
          actions.updateActivity();
        },

        disconnectWallet: (network: 'ethereum' | 'sui') => {
          const actions = get();
          actions.updateWalletState(network, {
            ...defaultWalletState,
            status: 'disconnected',
          });
          actions.updateActivity();
        },

        setWalletError: (network: 'ethereum' | 'sui', error: string) => {
          const actions = get();
          actions.updateWalletState(network, {
            error,
            status: 'error',
            isConnecting: false,
          });
        },

        // Swap form management
        updateSwapForm: (data: Partial<SwapFormData>) =>
          set(state => ({
            swap: {
              ...state.swap,
              formData: { ...state.swap.formData, ...data },
              lastUpdated: Date.now(),
            }
          })),

        setSwapQuote: (quote: Quote | null) =>
          set(state => ({
            swap: {
              ...state.swap,
              quote,
              isLoadingQuote: false,
              lastUpdated: Date.now(),
            }
          })),

        setSwapLoading: (isLoading: boolean) =>
          set(state => ({
            swap: { ...state.swap, isLoadingQuote: isLoading }
          })),

        swapTokens: () =>
          set(state => ({
            swap: {
              ...state.swap,
              formData: {
                ...state.swap.formData,
                fromToken: state.swap.formData.toToken,
                toToken: state.swap.formData.fromToken,
                isReversed: !state.swap.formData.isReversed,
              },
              quote: null,
              estimatedOutput: '',
            }
          })),

        resetSwapForm: () =>
          set(state => ({
            swap: {
              ...state.swap,
              formData: { ...defaultSwapFormData },
              quote: null,
              estimatedOutput: '',
              error: undefined,
            }
          })),

        setSwapError: (error: string | undefined) =>
          set(state => ({
            swap: { ...state.swap, error }
          })),

        // Balance management
        updateBalances: (network: 'ethereum' | 'sui', balances: Record<string, Balance>) =>
          set(state => {
            const newBalances = { ...state.balances };
            newBalances[network] = balances;
            
            // Calculate total USD value
            let totalUSD = 0;
            Object.values(newBalances.ethereum).forEach(balance => {
              totalUSD += balance.usdValue || 0;
            });
            Object.values(newBalances.sui).forEach(balance => {
              totalUSD += balance.usdValue || 0;
            });
            
            return {
              balances: {
                ...newBalances,
                totalUSD,
                lastUpdated: Date.now(),
              }
            };
          }),

        refreshBalances: async (force = false) => {
          const state = get();
          const timeSinceLastUpdate = Date.now() - state.balances.lastUpdated;
          
          // Don't refresh if updated recently unless forced
          if (!force && timeSinceLastUpdate < 30000) return; // 30 seconds
          
          state.setBalancesRefreshing(true);
          
          try {
            // Simulate cross-chain balance fetching
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Mock Ethereum balances
            const ethereumBalances: Record<string, Balance> = {
              'ETH': {
                tokenType: 'ETH',
                balance: '3450000000000000000',
                formattedBalance: '3.45',
                decimals: 18,
                symbol: 'ETH',
                usdValue: 3.45 * 3466
              },
              'USDC': {
                tokenType: '0xA0b86a33E6441d3e2DbEcC39ee4bd65A58da0e17',
                balance: '125000000',
                formattedBalance: '125.0',
                decimals: 6,
                symbol: 'USDC',
                usdValue: 125.0
              },
              'USDT': {
                tokenType: '0xdac17f958d2ee523a2206206994597c13d831ec7',
                balance: '75250000',
                formattedBalance: '75.25',
                decimals: 6,
                symbol: 'USDT',
                usdValue: 75.25
              },
              'DAI': {
                tokenType: '0x6b175474e89094c44da98b954eedeac495271d0f',
                balance: '200000000000000000000',
                formattedBalance: '200.0',
                decimals: 18,
                symbol: 'DAI',
                usdValue: 200.0
              }
            };

            // Mock Sui balances  
            const suiBalances: Record<string, Balance> = {
              'SUI': {
                tokenType: '0x2::sui::SUI',
                balance: '12350000000',
                formattedBalance: '12.35',
                decimals: 9,
                symbol: 'SUI',
                usdValue: 12.35 * 3.6
              },
              'USDC': {
                tokenType: '0x2::coin::COIN<0x123::usdc::USDC>',
                balance: '50750000',
                formattedBalance: '50.75',
                decimals: 6,
                symbol: 'USDC',
                usdValue: 50.75
              },
              'USDT': {
                tokenType: '0x2::coin::COIN<0x123::usdt::USDT>',
                balance: '25480000',
                formattedBalance: '25.48',
                decimals: 6,
                symbol: 'USDT',
                usdValue: 25.48
              },
              'WETH': {
                tokenType: '0x2::coin::COIN<0x123::weth::WETH>',
                balance: '1850000000000000000',
                formattedBalance: '1.85',
                decimals: 18,
                symbol: 'WETH',
                usdValue: 1.85 * 3466
              }
            };

            // Update both networks
            state.updateBalances('ethereum', ethereumBalances);
            state.updateBalances('sui', suiBalances);
            
          } catch (error) {
            console.error('Failed to refresh balances:', error);
          } finally {
            state.setBalancesRefreshing(false);
          }
        },

        setBalancesRefreshing: (isRefreshing: boolean) =>
          set(state => ({
            balances: { ...state.balances, isRefreshing }
          })),

        // Auction monitoring
        addAuctionToMonitor: (auctionId: string) =>
          set(state => ({
            auctions: {
              ...state.auctions,
              monitoredAuctionIds: [...new Set([...state.auctions.monitoredAuctionIds, auctionId])],
            }
          })),

        removeAuctionFromMonitor: (auctionId: string) =>
          set(state => ({
            auctions: {
              ...state.auctions,
              monitoredAuctionIds: state.auctions.monitoredAuctionIds.filter(id => id !== auctionId),
            }
          })),

        updateAuctionDetails: (auctionId: string, details: AuctionDetails) =>
          set(state => ({
            auctions: {
              ...state.auctions,
              auctionUpdates: {
                ...state.auctions.auctionUpdates,
                [auctionId]: details,
              },
              lastUpdate: Date.now(),
            }
          })),

        addAuctionNotification: (notification: Omit<AuctionNotification, 'id' | 'timestamp'>) =>
          set(state => ({
            auctions: {
              ...state.auctions,
              notifications: [
                {
                  ...notification,
                  id: Date.now().toString(),
                  timestamp: Date.now(),
                  isRead: false,
                },
                ...state.auctions.notifications,
              ].slice(0, 50), // Keep only last 50 notifications
            }
          })),

        markNotificationAsRead: (notificationId: string) =>
          set(state => ({
            auctions: {
              ...state.auctions,
              notifications: state.auctions.notifications.map(n =>
                n.id === notificationId ? { ...n, isRead: true } : n
              ),
            }
          })),

        clearNotifications: () =>
          set(state => ({
            auctions: { ...state.auctions, notifications: [] }
          })),

        // WebSocket management
        setWebSocketConnected: (isConnected: boolean) =>
          set(state => ({
            websocket: {
              ...state.websocket,
              isConnected,
              isConnecting: false,
              lastPing: isConnected ? Date.now() : state.websocket.lastPing,
              error: isConnected ? undefined : state.websocket.error,
            }
          })),

        setWebSocketError: (error: string | undefined) =>
          set(state => ({
            websocket: { ...state.websocket, error, isConnecting: false }
          })),

        addWebSocketSubscription: (subscription: string) =>
          set(state => ({
            websocket: {
              ...state.websocket,
              subscriptions: [...new Set([...state.websocket.subscriptions, subscription])],
            }
          })),

        removeWebSocketSubscription: (subscription: string) =>
          set(state => ({
            websocket: {
              ...state.websocket,
              subscriptions: state.websocket.subscriptions.filter(s => s !== subscription),
            }
          })),

        incrementReconnectAttempts: () =>
          set(state => ({
            websocket: {
              ...state.websocket,
              reconnectAttempts: state.websocket.reconnectAttempts + 1,
            }
          })),

        resetReconnectAttempts: () =>
          set(state => ({
            websocket: { ...state.websocket, reconnectAttempts: 0 }
          })),

        // Orders management
        updateOrders: (orders: Partial<OrdersState>) =>
          set(state => ({
            orders: { ...state.orders, ...orders }
          })),

        addOrder: (order: Order) =>
          set(state => ({
            orders: {
              ...state.orders,
              activeOrders: [order, ...state.orders.activeOrders],
            }
          })),

        updateOrderStatus: (orderId: string, status: string) =>
          set(state => ({
            orders: {
              ...state.orders,
              activeOrders: state.orders.activeOrders.map(order =>
                order.id === orderId ? { ...order, status } : order
              ),
            }
          })),

        setOrderFilters: (filters: Partial<OrderFilters>) =>
          set(state => ({
            orders: {
              ...state.orders,
              filters: { ...state.orders.filters, ...filters },
            }
          })),

        // Demo mode management
        toggleDemoMode: () =>
          set(state => ({
            demo: { ...state.demo, isDemoMode: !state.demo.isDemoMode }
          })),

        updateDemoConfig: (config: Partial<DemoState>) =>
          set(state => ({
            demo: { ...state.demo, ...config }
          })),

        resetDemoState: () =>
          set(() => ({ demo: { ...defaultDemoState } })),

        generateMockData: () => {
          const state = get();
          if (!state.demo.isDemoMode) return;
          
          // Generate random auction notification
          state.addAuctionNotification({
            auctionId: `demo_auction_${Date.now()}`,
            type: 'bid_placed',
            message: `New bid: ${(3.6 + Math.random() * 0.4).toFixed(4)} SUI/USDC`,
          });

          // Add random toast notification
          const messages = [
            'Cross-chain swap initiated',
            'Dutch auction started',
            'Order matched successfully',
            'MEV protection activated',
            'Relayer coordination complete'
          ];
          
          state.addToastNotification({
            type: 'info',
            title: 'Demo Activity',
            message: messages[Math.floor(Math.random() * messages.length)],
            duration: 3000,
          });
        },

        // UI management
        setLoading: (isLoading: boolean) =>
          set(state => ({
            ui: { ...state.ui, isLoading }
          })),

        toggleMobileMenu: () =>
          set(state => ({
            ui: { ...state.ui, showMobileMenu: !state.ui.showMobileMenu }
          })),

        setActiveModal: (modal: string | null) =>
          set(state => ({
            ui: { ...state.ui, activeModal: modal }
          })),

        addToastNotification: (notification: Omit<ToastNotification, 'id' | 'timestamp'>) =>
          set(state => ({
            ui: {
              ...state.ui,
              toastNotifications: [
                {
                  ...notification,
                  id: Date.now().toString(),
                  timestamp: Date.now(),
                  isVisible: true,
                },
                ...state.ui.toastNotifications,
              ].slice(0, 10), // Keep only last 10 notifications
            }
          })),

        removeToastNotification: (id: string) =>
          set(state => ({
            ui: {
              ...state.ui,
              toastNotifications: state.ui.toastNotifications.filter(n => n.id !== id),
            }
          })),

        toggleSidebar: () =>
          set(state => ({
            ui: { ...state.ui, sidebarCollapsed: !state.ui.sidebarCollapsed }
          })),

        updateActivity: () =>
          set(state => ({
            ui: { ...state.ui, lastActivity: Date.now() }
          })),

        // Utility actions
        resetStore: () =>
          set(() => ({
            userPreferences: { ...defaultUserPreferences },
            wallets: {
              ethereum: { ...defaultWalletState },
              sui: { ...defaultWalletState },
            },
            swap: {
              formData: { ...defaultSwapFormData },
              quote: null,
              isLoadingQuote: false,
              estimatedOutput: '',
              priceImpact: 0,
              minimumReceived: '',
              tradingFee: '',
              networkFee: '',
              isExecuting: false,
              lastUpdated: 0,
              error: undefined,
            },
            ui: {
              selectedNetwork: 'ethereum',
              isLoading: false,
              showMobileMenu: false,
              activeModal: null,
              toastNotifications: [],
              sidebarCollapsed: false,
              lastActivity: Date.now(),
            },
            // Reset other state to defaults...
          })),

        hydrate: () => {
          // Called after store is hydrated from localStorage
          // Perform any necessary data validation or migration
          const state = get();
          
          // Validate and migrate data if needed
          if (!state.userPreferences.language) {
            state.updatePreferences({ language: 'en' });
          }
          
          // Reset transient state
          state.setLoading(false);
          state.setBalancesRefreshing(false);
          state.setWebSocketConnected(false);
        },
      }),
      {
        name: '1inch-sui-store',
        storage: createJSONStorage(() => localStorage),
        // Only persist certain parts of the state
        partialize: (state) => ({
          userPreferences: state.userPreferences,
          ui: {
            selectedNetwork: state.ui.selectedNetwork,
            sidebarCollapsed: state.ui.sidebarCollapsed,
          },
          swap: {
            formData: {
              slippage: state.swap.formData.slippage,
              deadline: state.swap.formData.deadline,
            },
          },
          orders: {
            filters: state.orders.filters,
          },
          auctions: {
            monitoredAuctionIds: state.auctions.monitoredAuctionIds,
          },
        }),
        // Restore defaults for non-persisted state
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.hydrate();
          }
        },
        version: 1,
        migrate: (persistedState: any, version: number) => {
          // Handle migration from older versions if needed
          if (version === 0) {
            // Migrate from version 0 to version 1
            return {
              ...persistedState,
              userPreferences: {
                ...defaultUserPreferences,
                ...persistedState.userPreferences,
              },
            };
          }
          return persistedState;
        },
      }
    )
  )
);

// ==================== Selectors ====================

// Common selectors for better performance
export const selectWalletState = (network: 'ethereum' | 'sui') => (state: UnifiedStoreState) =>
  state.wallets[network];

export const selectIsWalletConnected = (network: 'ethereum' | 'sui') => (state: UnifiedStoreState) =>
  state.wallets[network].status === 'connected';

export const selectSwapFormData = (state: UnifiedStoreState) => state.swap.formData;

export const selectBalances = (network: 'ethereum' | 'sui') => (state: UnifiedStoreState) =>
  state.balances[network];

export const selectUserPreferences = (state: UnifiedStoreState) => state.userPreferences;

export const selectActiveNotifications = (state: UnifiedStoreState) =>
  state.auctions.notifications.filter(n => !n.isRead);

export const selectToastNotifications = (state: UnifiedStoreState) =>
  state.ui.toastNotifications.filter(n => n.isVisible);

// ==================== Demo Mode Enhancement ====================

export interface DemoState {
  isDemoMode: boolean;
  autoGenerateData: boolean;
  simulateRealTimeUpdates: boolean;
  mockLatency: number;
  successRate: number;
  enableMockNotifications: boolean;
}

const defaultDemoState: DemoState = {
  isDemoMode: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
  autoGenerateData: true,
  simulateRealTimeUpdates: true,
  mockLatency: 200,
  successRate: 0.95,
  enableMockNotifications: true,
};

// ==================== Hooks ====================

// Convenience hooks for common use cases
export const useWalletState = (network: 'ethereum' | 'sui') =>
  useUnifiedStore(selectWalletState(network));

export const useIsWalletConnected = (network: 'ethereum' | 'sui') =>
  useUnifiedStore(selectIsWalletConnected(network));

export const useSwapForm = () => useUnifiedStore(selectSwapFormData);

export const useUserPreferences = () => useUnifiedStore(selectUserPreferences);

// Demo mode hooks
export const useDemoMode = () => {
  const demo = useUnifiedStore(state => state.demo);
  const toggleDemoMode = useUnifiedStore(state => state.toggleDemoMode);
  const updateDemoConfig = useUnifiedStore(state => state.updateDemoConfig);
  const generateMockData = useUnifiedStore(state => state.generateMockData);
  const resetDemoState = useUnifiedStore(state => state.resetDemoState);
  
  return {
    ...demo,
    toggleDemoMode,
    updateDemoConfig,
    generateMockData,
    resetDemoState,
  };
};

// Cross-chain balance hooks
export const useCrossChainBalances = () => {
  const balances = useUnifiedStore(state => state.balances);
  const refreshBalances = useUnifiedStore(state => state.refreshBalances);
  const isRefreshing = useUnifiedStore(state => state.balances.isRefreshing);
  
  // Auto-refresh on mount and wallet connections
  const wallets = useUnifiedStore(state => state.wallets);
  
  // Calculate aggregated USDC balance across chains
  const totalUSDCBalance = useMemo(() => {
    const ethUSDC = Object.values(balances.ethereum).find(b => b.symbol === 'USDC');
    const suiUSDC = Object.values(balances.sui).find(b => b.symbol === 'USDC');
    
    const ethAmount = ethUSDC ? parseFloat(ethUSDC.formattedBalance) : 0;
    const suiAmount = suiUSDC ? parseFloat(suiUSDC.formattedBalance) : 0;
    
    return {
      total: ethAmount + suiAmount,
      ethereum: ethAmount,
      sui: suiAmount,
      breakdown: { ethUSDC, suiUSDC }
    };
  }, [balances]);
  
  // Calculate portfolio distribution
  const portfolioBreakdown = useMemo(() => {
    const total = balances.totalUSD;
    if (total === 0) return { ethereum: 0, sui: 0 };
    
    const ethTotal = Object.values(balances.ethereum)
      .reduce((sum, balance) => sum + (balance.usdValue || 0), 0);
    const suiTotal = Object.values(balances.sui)
      .reduce((sum, balance) => sum + (balance.usdValue || 0), 0);
    
    return {
      ethereum: (ethTotal / total) * 100,
      sui: (suiTotal / total) * 100,
      values: { ethereum: ethTotal, sui: suiTotal }
    };
  }, [balances]);
  
  return {
    balances,
    refreshBalances,
    isRefreshing,
    totalUSDCBalance,
    portfolioBreakdown,
    lastUpdated: balances.lastUpdated,
    isConnected: {
      ethereum: wallets.ethereum.status === 'connected',
      sui: wallets.sui.status === 'connected'
    }
  };
};

export const useNetworkBalances = (network: 'ethereum' | 'sui') => {
  const networkBalances = useUnifiedStore(state => state.balances[network]);
  const isWalletConnected = useUnifiedStore(state => state.wallets[network].status === 'connected');
  
  // Calculate network total in USD
  const totalUSD = useMemo(() => 
    Object.values(networkBalances).reduce((sum, balance) => sum + (balance.usdValue || 0), 0),
    [networkBalances]
  );
  
  // Get stablecoin balances for the network
  const stablecoins = useMemo(() => 
    Object.values(networkBalances).filter(balance => 
      ['USDC', 'USDT', 'DAI'].includes(balance.symbol)
    ),
    [networkBalances]
  );
  
  return {
    balances: networkBalances,
    totalUSD,
    stablecoins,
    isConnected: isWalletConnected,
    isEmpty: Object.keys(networkBalances).length === 0
  };
};

// Legacy compatibility hooks
export const useGlobalState = () => {
  const nativeCurrency = useUnifiedStore(state => state.nativeCurrency);
  const targetNetwork = useUnifiedStore(state => state.targetNetwork);
  const setNativeCurrencyPrice = useUnifiedStore(state => state.setNativeCurrencyPrice);
  const setIsNativeCurrencyFetching = useUnifiedStore(state => state.setIsNativeCurrencyFetching);
  const setTargetNetwork = useUnifiedStore(state => state.setTargetNetwork);

  return {
    nativeCurrency,
    targetNetwork,
    setNativeCurrencyPrice,
    setIsNativeCurrencyFetching,
    setTargetNetwork,
  };
};

export default useUnifiedStore;