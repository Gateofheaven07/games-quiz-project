'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getSocket } from '../lib/socketSingleton';
import { apiClient } from '../lib/api';

interface NotificationContextType {
  unreadCount: number;
  friendRequestCount: number;
  setUnreadCount: (count: number) => void;
  setFriendRequestCount: (count: number) => void;
  refreshCounts: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const { user, token } = useAuth();

  const refreshCounts = useCallback(async () => {
    if (!token) return;
    try {
      const [unreadRes, requestsRes] = await Promise.all([
        apiClient.get('/notifications/unread', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        apiClient.get('/friends/requests', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (unreadRes.data?.data) {
        setUnreadCount(unreadRes.data.data.count);
      }
      if (requestsRes.data?.data) {
        setFriendRequestCount(requestsRes.data.data.length);
      }
    } catch (err) {
      console.error('Failed to refresh notification counts', err);
    }
  }, [token]);

  useEffect(() => {
    if (!user || !token) {
      setUnreadCount(0);
      setFriendRequestCount(0);
      return;
    }

    refreshCounts();

    const socket = getSocket(token);

    const onReceiveMessage = () => {
      setUnreadCount(prev => prev + 1);
    };

    const onReceiveInvite = () => {
      setUnreadCount(prev => prev + 1);
    };

    const onFriendRequest = () => {
      setFriendRequestCount(prev => prev + 1);
    };

    socket.on('receive_message', onReceiveMessage);
    socket.on('receive_invite', onReceiveInvite);
    socket.on('friend:request', onFriendRequest);

    return () => {
      socket.off('receive_message', onReceiveMessage);
      socket.off('receive_invite', onReceiveInvite);
      socket.off('friend:request', onFriendRequest);
    };
  }, [user, token, refreshCounts]);

  return (
    <NotificationContext.Provider value={{ 
      unreadCount, 
      friendRequestCount, 
      setUnreadCount, 
      setFriendRequestCount,
      refreshCounts
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}
