'use client';

import { useState, useEffect } from 'react';
import { getSocket } from '../lib/socketSingleton';
import { useAuth } from './useAuth';
import { apiClient } from '../lib/api';

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, token } = useAuth();

  useEffect(() => {
    if (!user || !token) return;

    // Fetch initial unread count
    const fetchUnread = async () => {
      try {
        const res = await apiClient.get('/notifications/unread', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.data) {
          setUnreadCount(res.data.data.count);
        }
      } catch (err) {
        console.error('Failed to fetch unread notifications', err);
      }
    };
    fetchUnread();

    const socket = getSocket(token);

    const onReceiveMessage = () => {
      setUnreadCount(prev => prev + 1);
    };

    const onReceiveInvite = () => {
      setUnreadCount(prev => prev + 1);
    };

    socket.on('receive_message', onReceiveMessage);
    socket.on('receive_invite', onReceiveInvite);

    return () => {
      socket.off('receive_message', onReceiveMessage);
      socket.off('receive_invite', onReceiveInvite);
    };
  }, [user, token]);

  return { unreadCount, setUnreadCount };
}
