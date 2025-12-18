import { useEffect, useRef } from 'react';

export function useMarketSync() {
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const syncMarketData = async () => {
      try {
        const now = new Date();
        const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday
        const hour = now.getHours();

        // Only sync during market hours: Monday-Friday, 9 AM - 3 PM
        if (day >= 1 && day <= 5 && hour >= 9 && hour < 15) {
          await fetch('/api/market-sync', { method: 'POST' });
        }
      } catch (error) {
        console.error('Market sync error:', error);
      }
    };

    // Initial sync
    syncMarketData();

    // Set up interval to sync every minute
    syncIntervalRef.current = setInterval(syncMarketData, 60000); // 60 seconds

    // Cleanup on unmount
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);
}
