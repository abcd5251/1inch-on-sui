/**
 * Real-time Notification System for 1inch-on-Sui Hackathon Demo
 * 
 * Features:
 * - Animated notifications with smooth transitions
 * - Auto-dismissal with configurable duration
 * - Demo mode integration with automatic mock notifications
 * - Multiple positioning options (corners)
 * - Progress bars for timed notifications
 * - Icon-based type differentiation (success, error, warning, info)
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <NotificationSystem position="top-right" maxNotifications={5} />
 * 
 * // With custom hook
 * const { notify } = useNotifications();
 * notify.success("Success!", "Operation completed successfully");
 * ```
 */
"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  InformationCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  SparklesIcon 
} from "@heroicons/react/24/outline";
import { useUnifiedStore } from "~~/services/store/unifiedStore";
import { useDemoMode } from "~~/services/store/unifiedStore";

interface NotificationSystemProps {
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxNotifications?: number;
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  className = "",
  position = 'top-right',
  maxNotifications = 5,
}) => {
  const { ui, removeToastNotification } = useUnifiedStore();
  const { isDemoMode, generateMockData } = useDemoMode();
  
  const notifications = ui.toastNotifications
    .filter(n => n.isVisible)
    .slice(0, maxNotifications);

  // Auto-generate demo notifications when in demo mode
  useEffect(() => {
    if (!isDemoMode) return;

    const interval = setInterval(() => {
      if (Math.random() > 0.7 && notifications.length < 3) {
        generateMockData();
      }
    }, 15000); // Every 15 seconds with 30% chance

    return () => clearInterval(interval);
  }, [isDemoMode, generateMockData, notifications.length]);

  // Auto-dismiss notifications after their duration
  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.duration && notification.duration > 0) {
        const timer = setTimeout(() => {
          removeToastNotification(notification.id);
        }, notification.duration);

        return () => clearTimeout(timer);
      }
    });
  }, [notifications, removeToastNotification]);

  const getPositionClasses = (position: string): string => {
    const baseClasses = "fixed z-50 pointer-events-none";
    switch (position) {
      case 'top-right':
        return `${baseClasses} top-4 right-4`;
      case 'top-left':
        return `${baseClasses} top-4 left-4`;
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      default:
        return `${baseClasses} top-4 right-4`;
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconClasses = "w-5 h-5 mr-2 flex-shrink-0";
    
    switch (type) {
      case 'success':
        return <CheckCircleIcon className={`${iconClasses} text-green-500`} />;
      case 'error':
        return <ExclamationCircleIcon className={`${iconClasses} text-red-500`} />;
      case 'warning':
        return <ExclamationTriangleIcon className={`${iconClasses} text-yellow-500`} />;
      case 'info':
        return <InformationCircleIcon className={`${iconClasses} text-blue-500`} />;
      default:
        return <SparklesIcon className={`${iconClasses} text-purple-500`} />;
    }
  };

  const getNotificationColors = (type: string): string => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-purple-50 border-purple-200 text-purple-800';
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return new Date(timestamp).toLocaleDateString();
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={`${getPositionClasses(position)} ${className}`}>
      <div className="space-y-3 max-w-sm">
        <AnimatePresence mode="popLayout">
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: position.includes('right') ? 100 : -100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: position.includes('right') ? 100 : -100, scale: 0.8 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                opacity: { duration: 0.2 }
              }}
              className="pointer-events-auto"
            >
              <div className={`
                rounded-lg border shadow-lg p-4 max-w-sm relative
                ${getNotificationColors(notification.type)}
                backdrop-blur-sm bg-opacity-95
              `}>
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start flex-1">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {notification.title}
                      </div>
                      <div className="text-xs opacity-75 mt-1">
                        {formatTimestamp(notification.timestamp)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Close Button */}
                  <button
                    onClick={() => removeToastNotification(notification.id)}
                    className="ml-2 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
                    aria-label="Dismiss notification"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Message */}
                <div className="text-sm leading-relaxed mb-3">
                  {notification.message}
                </div>

                {/* Progress Bar for Timed Notifications */}
                {notification.duration && notification.duration > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-10 rounded-b-lg overflow-hidden">
                    <motion.div
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{ 
                        duration: notification.duration / 1000,
                        ease: "linear"
                      }}
                      className="h-full bg-current opacity-30"
                    />
                  </div>
                )}

                {/* Demo Badge */}
                {isDemoMode && (
                  <div className="absolute -top-1 -right-1">
                    <div className="badge badge-xs badge-info">
                      DEMO
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Demo Mode Indicator */}
      {isDemoMode && notifications.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 pointer-events-auto"
        >
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-lg p-3 text-center">
            <div className="text-xs text-purple-700 font-medium">
              🎭 Demo Mode Active
            </div>
            <div className="text-xs text-purple-600 mt-1">
              Real-time notifications simulated
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Hook for easy notification management
export const useNotifications = () => {
  const { addToastNotification, removeToastNotification, ui } = useUnifiedStore();

  const notify = {
    success: (title: string, message: string, duration = 5000) => {
      addToastNotification({
        type: 'success',
        title,
        message,
        duration,
      });
    },
    
    error: (title: string, message: string, duration = 8000) => {
      addToastNotification({
        type: 'error',
        title,
        message,
        duration,
      });
    },
    
    warning: (title: string, message: string, duration = 6000) => {
      addToastNotification({
        type: 'warning',
        title,
        message,
        duration,
      });
    },
    
    info: (title: string, message: string, duration = 4000) => {
      addToastNotification({
        type: 'info',
        title,
        message,
        duration,
      });
    },

    custom: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, duration?: number) => {
      addToastNotification({
        type,
        title,
        message,
        duration,
      });
    },

    dismiss: (id: string) => {
      removeToastNotification(id);
    },

    dismissAll: () => {
      ui.toastNotifications.forEach(notification => {
        removeToastNotification(notification.id);
      });
    }
  };

  return {
    notify,
    notifications: ui.toastNotifications.filter(n => n.isVisible),
    hasNotifications: ui.toastNotifications.some(n => n.isVisible),
  };
};

export default NotificationSystem;