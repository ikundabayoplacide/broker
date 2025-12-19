'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { RefreshCw } from 'lucide-react';

export default function MarketSyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/market-sync?force=true', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✓ Synced ${data.stats?.synced || 0} companies`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage(`✗ ${data.error || 'Sync failed'}`);
      }
    } catch (error) {
      setMessage('✗ Network error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleSync}
        disabled={syncing}
        variant="outline"
        className="text-xs py-1.5 px-3 flex items-center hover:bg-[#004B5B] hover:text-white hover:border-[#004B5B] transition-all duration-200"
      >
        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing...' : 'Sync RSE Data'}
      </Button>
      {message && (
        <span className={`text-xs ${message.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </span>
      )}
    </div>
  );
}
