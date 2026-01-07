'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import axios from '@/lib/axios';

export function useProfileReminder() {
  const { user, token } = useAuth();
  const [fullUserData, setFullUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id || !token) {
        setLoading(false);
        return;
      }

      try {
        const userResponse = await axios.get('/user', { 
          headers: { Authorization: `Bearer ${token}` } 
        });

        const currentUser = Array.isArray(userResponse.data) 
          ? userResponse.data.find((u: any) => u.id === user.id)
          : userResponse.data;
        
        setFullUserData(currentUser);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user?.id, token]);

  return {
    fullUserData,
    loading,
  };
}