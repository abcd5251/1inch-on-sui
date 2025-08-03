'use client';

import { useEffect, useState } from 'react';
import { useUnifiedStore } from '~~/services/store/unifiedStore';
import { useRelayerWebSocket } from '~~/services/websocket/RelayerWebSocket';
import { DutchAuctionVisualizer } from './DutchAuctionVisualizer';
import type { AuctionDetails, FusionOrder } from '@1inch/sui-fusion-sdk';

interface AuctionMonitorProps {
  className?: string;
  maxAuctions?: number;
  showOfflineMessage?: boolean;
}

export const AuctionMonitor: React.FC<AuctionMonitorProps> = ({
  className = '',
  maxAuctions = 5,
  showOfflineMessage = true,
}) => {
  const {
    isConnected,
    isConnecting,
    error,
    subscriptions,
    reconnectAttempts,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  } = useRelayerWebSocket();

  const {
    auctions: { activeAuctions, auctionUpdates, isMonitoring, notifications },
    addAuctionToMonitor,
    removeAuctionFromMonitor,
    clearNotifications,
    addToastNotification,
  } = useUnifiedStore();

  const [expandedAuctions, setExpandedAuctions] = useState<Set<string>>(new Set());

  // Auto-connect on mount
  useEffect(() => {
    if (!isConnected && !isConnecting) {
      connect().catch(console.error);
    }

    return () => {
      // Don't disconnect on unmount as other components might be using it
    };
  }, []);

  // Subscribe to active auctions
  useEffect(() => {
    if (isConnected && activeAuctions.length > 0) {
      activeAuctions.forEach(auction => {
        if (auction.auctionId && !subscriptions.includes(auction.auctionId)) {
          subscribe(auction.auctionId);
        }
      });
    }
  }, [isConnected, activeAuctions, subscriptions, subscribe]);

  const toggleAuctionExpansion = (auctionId: string) => {
    const newExpanded = new Set(expandedAuctions);
    if (newExpanded.has(auctionId)) {
      newExpanded.delete(auctionId);
    } else {
      newExpanded.add(auctionId);
    }
    setExpandedAuctions(newExpanded);
  };

  const handleSubscribeToAuction = (auctionId: string) => {
    subscribe(auctionId);
    addToastNotification({
      type: 'info',
      title: 'Monitoring Started',
      message: `Now monitoring auction ${auctionId.slice(0, 8)}...`,
    });
  };

  const handleUnsubscribeFromAuction = (auctionId: string) => {
    unsubscribe(auctionId);
    addToastNotification({
      type: 'info',
      title: 'Monitoring Stopped',
      message: `Stopped monitoring auction ${auctionId.slice(0, 8)}...`,
    });
  };

  // Get live auction details (prioritize real-time updates)
  const getLiveAuctionDetails = (auctionId: string): AuctionDetails | null => {
    return auctionUpdates[auctionId] || activeAuctions.find(a => a.auctionId === auctionId) || null;
  };

  const unreadNotifications = notifications.filter(n => !n.isRead);

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-gray-900">🎯 Live Auctions</h2>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
            isConnected ? 'bg-green-100 text-green-800' : 
            isConnecting ? 'bg-yellow-100 text-yellow-800' : 
            'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 
              isConnecting ? 'bg-yellow-500 animate-pulse' : 
              'bg-red-500'
            }`} />
            <span>
              {isConnected ? 'Live' : 
               isConnecting ? 'Connecting...' : 
               `Offline${reconnectAttempts > 0 ? ` (${reconnectAttempts}/5)` : ''}`}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Notifications */}
          {unreadNotifications.length > 0 && (
            <div className="relative">
              <button
                onClick={clearNotifications}
                className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title={`${unreadNotifications.length} unread notifications`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5V3h0z" />
                </svg>
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadNotifications.length}
                </div>
              </button>
            </div>
          )}

          {/* Connection Controls */}
          <button
            onClick={isConnected ? disconnect : connect}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isConnected 
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800 font-medium">Connection Error</span>
          </div>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Offline Message */}
      {!isConnected && showOfflineMessage && !error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-yellow-800 font-medium">Real-time monitoring unavailable</p>
              <p className="text-yellow-700 text-sm">
                Connect to the relayer to receive live auction updates and notifications.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Auctions */}
      <div className="space-y-4">
        {activeAuctions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Auctions</h3>
            <p className="text-gray-600">
              {isConnected 
                ? 'No Dutch auctions are currently running. Create a new auction to get started.'
                : 'Connect to the relayer to see live auction data.'
              }
            </p>
          </div>
        ) : (
          activeAuctions.slice(0, maxAuctions).map((auction) => {
            const liveDetails = getLiveAuctionDetails(auction.auctionId!);
            const isExpanded = expandedAuctions.has(auction.auctionId!);
            const isSubscribed = subscriptions.includes(auction.auctionId!);

            return (
              <div key={auction.auctionId} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Auction Header */}
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-lg font-semibold text-gray-900">
                        {auction.tokenPair || `${auction.startRate} → ${auction.endRate}`}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        auction.status === 'active' ? 'bg-green-100 text-green-800' :
                        auction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {auction.status}
                      </div>
                      {isSubscribed && (
                        <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center space-x-1">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                          <span>Live</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Subscribe/Unsubscribe */}
                      {isConnected && (
                        <button
                          onClick={() => isSubscribed 
                            ? handleUnsubscribeFromAuction(auction.auctionId!)
                            : handleSubscribeToAuction(auction.auctionId!)
                          }
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            isSubscribed
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {isSubscribed ? 'Unwatch' : 'Watch'}
                        </button>
                      )}

                      {/* Expand/Collapse */}
                      <button
                        onClick={() => toggleAuctionExpansion(auction.auctionId!)}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg 
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Current Rate:</span>
                      <div className="font-medium">{liveDetails?.currentRate || auction.currentRate}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Remaining:</span>
                      <div className="font-medium">
                        {liveDetails?.remainingTime ? `${liveDetails.remainingTime}s` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Auction ID:</span>
                      <div className="font-mono text-xs">{auction.auctionId?.slice(0, 12)}...</div>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && liveDetails && (
                  <div className="p-4">
                    <DutchAuctionVisualizer
                      auctionDetails={liveDetails}
                      showBidding={isConnected}
                      showChart={true}
                      onBidPlace={(price) => {
                        addToastNotification({
                          type: 'success',
                          title: 'Bid Placed',
                          message: `Bid of ${price.toFixed(6)} placed successfully`,
                        });
                      }}
                      onAuctionEnd={(winningBid) => {
                        if (winningBid) {
                          addToastNotification({
                            type: 'success',
                            title: 'Auction Won!',
                            message: `Won with bid of ${winningBid.price.toFixed(6)}`,
                          });
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Show More Button */}
      {activeAuctions.length > maxAuctions && (
        <div className="text-center mt-6">
          <button className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            Show {activeAuctions.length - maxAuctions} More Auctions
          </button>
        </div>
      )}

      {/* Recent Notifications */}
      {unreadNotifications.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {unreadNotifications.slice(0, 3).map((notification) => (
              <div key={notification.id} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <div className="text-blue-600">
                  {notification.type === 'bid_placed' && '💰'}
                  {notification.type === 'auction_won' && '🏆'}
                  {notification.type === 'auction_ended' && '⏰'}
                  {notification.type === 'price_alert' && '📊'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">{notification.message}</p>
                  <p className="text-xs text-blue-700">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {unreadNotifications.length > 3 && (
              <p className="text-sm text-gray-600 text-center">
                +{unreadNotifications.length - 3} more notifications
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionMonitor;