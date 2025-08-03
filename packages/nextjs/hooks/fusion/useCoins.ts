/**
 * Placeholder hook for coin management
 * This is a stub to prevent import errors
 */

export const useCoins = () => {
  return {
    coins: [],
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve(),
  };
};

export default useCoins;