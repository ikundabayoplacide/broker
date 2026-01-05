"use client";

import { useState, useEffect } from 'react';

interface MarketStatusProps {
  className?: string;
}

interface MarketStatusData {
  label: string;
  isOpen: boolean;
}

export const MarketStatus: React.FC<MarketStatusProps> = ({ className = '' }) => {
  const [marketStatus, setMarketStatus] = useState<MarketStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarketStatus = async () => {
      try {
        const response = await fetch("/api/market-summary");
        if (response.ok) {
          const data = await response.json();
          if (data.marketStatus) {
            setMarketStatus({
              label: data.marketStatus.label,
              isOpen: data.marketStatus.isOpen,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching market status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketStatus();
    
    // Refresh market status every 30 seconds
    const interval = setInterval(fetchMarketStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 h-8 w-32 rounded-full ${className}`}></div>
    );
  }

  if (!marketStatus) {
    return null;
  }

  return (
    <span 
      className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
        marketStatus.isOpen 
          ? 'bg-emerald-100 text-emerald-700' 
          : 'bg-rose-100 text-rose-700'
      } ${className}`}
    >
      {marketStatus.isOpen ? '● Market Open' : '● Market Closed'}
    </span>
  );
};