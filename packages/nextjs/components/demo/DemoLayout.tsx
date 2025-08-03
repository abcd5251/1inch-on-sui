/**
 * Demo Layout Wrapper for 1inch-on-Sui Hackathon
 * 
 * Features:
 * - Automatic demo mode detection and UI adaptation
 * - Integrated notification system with customizable positioning
 * - Demo control panel with keyboard shortcuts (Ctrl+D to toggle)
 * - Animated demo mode indicators and background patterns
 * - Keyboard shortcuts helper and accessibility features
 * - Responsive design with mobile-friendly controls
 * - Real-time demo status visualization
 * 
 * @example
 * ```tsx
 * // Basic layout with demo controls
 * <DemoLayout showControls={true}>
 *   <YourAppContent />
 * </DemoLayout>
 * 
 * // Layout without controls for embedded use
 * <DemoLayout showControls={false}>
 *   <MinimalContent />
 * </DemoLayout>
 * ```
 * 
 * @component
 * @author 1inch-on-Sui Hackathon Team
 */
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  EyeIcon, 
  EyeSlashIcon,
  CogIcon,
  XMarkIcon,
  ChartBarSquareIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import { NotificationSystem } from "~~/components/ui/NotificationSystem";
import { DemoControlPanel } from "~~/components/demo/DemoControlPanel";
import { useDemoMode } from "~~/services/store/unifiedStore";

/**
 * Props for the Demo Layout component
 * 
 * @interface DemoLayoutProps
 * @property {React.ReactNode} children - Child components to wrap in demo layout
 * @property {boolean} [showControls=true] - Whether to show demo control panel
 * @property {string} [className=""] - Additional CSS classes for the layout container
 */
interface DemoLayoutProps {
  children: React.ReactNode;
  showControls?: boolean;
  className?: string;
}

export const DemoLayout: React.FC<DemoLayoutProps> = ({
  children,
  showControls = true,
  className = "",
}) => {
  // Demo layout state management
  const [controlsVisible, setControlsVisible] = useState(false); // Control panel visibility
  const [controlsMinimized, setControlsMinimized] = useState(true); // Control panel minimization state
  const [notificationPosition, setNotificationPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right'); // Notification positioning
  const { isDemoMode } = useDemoMode(); // Demo mode state from unified store

  // Auto-show controls in demo mode
  useEffect(() => {
    if (isDemoMode && showControls) {
      setControlsVisible(true);
    }
  }, [isDemoMode, showControls]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl/Cmd + D to toggle demo controls
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();
        setControlsVisible(prev => !prev);
      }
      
      // Ctrl/Cmd + Shift + D to toggle controls minimization
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setControlsMinimized(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const toggleControls = () => {
    setControlsVisible(prev => !prev);
    if (!controlsVisible) {
      setControlsMinimized(false);
    }
  };

  const toggleMinimize = () => {
    setControlsMinimized(prev => !prev);
  };

  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Main Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Demo Mode Indicator */}
      <AnimatePresence>
        {isDemoMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="fixed top-4 left-4 z-50"
          >
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-lg px-4 py-2 shadow-lg">
              <div className="flex items-center space-x-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <SparklesIcon className="w-5 h-5 text-purple-600" />
                </motion.div>
                <div>
                  <div className="text-sm font-medium text-purple-800">Hackathon Demo Mode</div>
                  <div className="text-xs text-purple-600">Real-time simulation active</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Toggle Button */}
      {showControls && !controlsVisible && (
        <motion.button
          onClick={toggleControls}
          className="fixed bottom-4 left-4 z-40 btn btn-circle btn-primary shadow-lg"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <CogIcon className="w-6 h-6" />
        </motion.button>
      )}

      {/* Demo Control Panel */}
      <AnimatePresence>
        {showControls && controlsVisible && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-4 top-1/2 transform -translate-y-1/2 z-40 max-w-sm w-full max-h-[80vh] overflow-y-auto"
          >
            <DemoControlPanel
              minimized={controlsMinimized}
              onToggleMinimize={toggleMinimize}
              className="w-full"
            />
            
            {/* Close Button for Full Panel */}
            {!controlsMinimized && (
              <motion.button
                onClick={() => setControlsVisible(false)}
                className="absolute -top-2 -right-2 btn btn-xs btn-circle btn-error"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <XMarkIcon className="w-3 h-3" />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification System */}
      <NotificationSystem 
        position={notificationPosition}
        maxNotifications={5}
        className="z-50"
      />

      {/* Notification Position Controller */}
      {isDemoMode && (
        <div className="fixed bottom-4 right-16 z-40">
          <div className="dropdown dropdown-top dropdown-end">
            <label tabIndex={0} className="btn btn-xs btn-ghost">
              📍
            </label>
            <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-48">
              <li>
                <button 
                  onClick={() => setNotificationPosition('top-right')}
                  className={notificationPosition === 'top-right' ? 'active' : ''}
                >
                  Top Right
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setNotificationPosition('top-left')}
                  className={notificationPosition === 'top-left' ? 'active' : ''}
                >
                  Top Left
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setNotificationPosition('bottom-right')}
                  className={notificationPosition === 'bottom-right' ? 'active' : ''}
                >
                  Bottom Right
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setNotificationPosition('bottom-left')}
                  className={notificationPosition === 'bottom-left' ? 'active' : ''}
                >
                  Bottom Left
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Demo Background Pattern */}
      {isDemoMode && (
        <div className="fixed inset-0 pointer-events-none z-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-transparent to-blue-100"></div>
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(147, 51, 234, 0.1) 0%, transparent 50%),
                             radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)`,
          }}></div>
        </div>
      )}

      {/* Keyboard Shortcuts Helper */}
      {isDemoMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30"
        >
          <div className="bg-black bg-opacity-75 text-white text-xs px-3 py-1 rounded-full">
            💡 Press Ctrl+D to toggle demo controls
          </div>
        </motion.div>
      )}
    </div>
  );
};

/**
 * Custom hook for managing demo layout state
 * 
 * Provides state management and control functions for demo layout components.
 * Useful for external components that need to interact with demo layout state.
 * 
 * @returns {Object} Demo layout state and control functions
 * @returns {boolean} isDemoMode - Current demo mode status
 * @returns {function} toggleDemoMode - Function to toggle demo mode
 * @returns {boolean} isControlsVisible - Control panel visibility state
 * @returns {function} showControls - Function to show control panel
 * @returns {function} hideControls - Function to hide control panel
 * @returns {function} toggleControls - Function to toggle control panel visibility
 * @returns {boolean} isMinimized - Control panel minimization state
 * @returns {function} minimize - Function to minimize control panel
 * @returns {function} maximize - Function to maximize control panel
 * @returns {function} toggleMinimize - Function to toggle minimization state
 * 
 * @example
 * ```tsx
 * const { isDemoMode, toggleDemoMode, showControls } = useDemoLayout();
 * 
 * return (
 *   <button onClick={toggleDemoMode}>
 *     {isDemoMode ? 'Exit Demo' : 'Enter Demo'}
 *   </button>
 * );
 * ```
 */
export const useDemoLayout = () => {
  const [isControlsVisible, setControlsVisible] = useState(false);
  const [isMinimized, setMinimized] = useState(true);
  const { isDemoMode, toggleDemoMode } = useDemoMode();

  const showControls = () => setControlsVisible(true);
  const hideControls = () => setControlsVisible(false);
  const toggleControls = () => setControlsVisible(prev => !prev);
  
  const minimize = () => setMinimized(true);
  const maximize = () => setMinimized(false);
  const toggleMinimize = () => setMinimized(prev => !prev);

  return {
    isDemoMode,
    toggleDemoMode,
    isControlsVisible,
    showControls,
    hideControls,
    toggleControls,
    isMinimized,
    minimize,
    maximize,
    toggleMinimize,
  };
};

export default DemoLayout;