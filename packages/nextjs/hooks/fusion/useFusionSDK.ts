/**
 * Placeholder hook for Fusion SDK
 * This is a stub to prevent import errors
 */

export const useFusionSDK = () => {
  return {
    sdk: null,
    isInitialized: false,
    isLoading: false,
    error: null,
    initialize: () => Promise.resolve(),
  };
};

export default useFusionSDK;