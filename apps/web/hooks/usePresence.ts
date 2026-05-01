'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSocket } from './useSocket'

interface Friend {
  id: string
  username: string
  level: number
  wins: number
  totalScore: number
}

export function usePresence(friends: Friend[]) {
  const { socket, isConnected } = useSocket()
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  // Request online list when socket connects or friends list changes
  useEffect(() => {
    if (isConnected && socket && friends.length > 0) {
      socket.emit('presence:get_online', friends.map(f => f.id))
    }
  }, [isConnected, socket, friends])

  useEffect(() => {
    if (!socket) return

    const handleOnlineList = (onlineIds: string[]) => {
      setOnlineUsers(new Set(onlineIds))
    }

    const handlePresenceUpdate = (data: { userId: string, isOnline: boolean }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev)
        if (data.isOnline) next.add(data.userId)
        else next.delete(data.userId)
        return next
      })
    }

    socket.on('presence:online_list', handleOnlineList)
    socket.on('presence:update', handlePresenceUpdate)

    return () => {
      socket.off('presence:online_list', handleOnlineList)
      socket.off('presence:update', handlePresenceUpdate)
    }
  }, [socket])

  const isOnline = useCallback((userId: string) => onlineUsers.has(userId), [onlineUsers])

  return { onlineUsers, isOnline }
}
