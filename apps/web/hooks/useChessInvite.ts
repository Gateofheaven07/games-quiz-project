'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from './use-toast'
import { useRouter } from 'next/navigation'
import { getSocket } from '../lib/socketSingleton'
import { useAuth } from './useAuth'

export function useChessInvite() {
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated, token } = useAuth()

  // State for incoming invite
  const [incomingChessInvite, setIncomingChessInvite] = useState<any | null>(null)
  const [chessInviteTimeout, setChessInviteTimeout] = useState<number>(30)

  // Track invite ref to avoid stale closure in handleInviteExpired
  const incomingChessInviteRef = useRef<any | null>(null)
  incomingChessInviteRef.current = incomingChessInvite

  // Clear incoming invite
  const clearIncoming = useCallback(() => {
    setIncomingChessInvite(null)
    setChessInviteTimeout(30)
  }, [])

  useEffect(() => {
    // Only attach listeners when authenticated and token available
    if (!isAuthenticated || !token) return

    const socket = getSocket(token)

    console.log('[ChessInvite] Attaching socket listeners, socket id:', socket.id)
    console.log('[ChessInvite] Current auth state:', { isAuthenticated, hasToken: !!token })

    const handleReceiveInvite = (data: any) => {
      console.log('[ChessInvite] Received chess:receive_invite:', data)
      // data: { senderId, senderUsername, roomCode, duration, mode }
      setIncomingChessInvite(data)
      setChessInviteTimeout(30)
    }

    const handleReceiveGeneralInvite = (data: any) => {
      // Listen to general 'receive_invite' but filter only for CHESS_INVITE
      if (data.type === 'CHESS_INVITE') {
        console.log('[ChessInvite] Received general receive_invite (CHESS_INVITE):', data)
        const normalizedData = {
          senderId: data.senderId || data.sender?.id,
          senderUsername: data.senderUsername || data.sender?.username,
          roomCode: data.roomCode || data.roomId,
          duration: data.duration,
          mode: data.mode || 'invite'
        }
        setIncomingChessInvite(normalizedData)
        setChessInviteTimeout(30)
      }
    }

    const handleInviteExpired = (data: { roomCode: string }) => {
      console.log('[ChessInvite] Invite expired:', data)
      if (incomingChessInviteRef.current?.roomCode === data.roomCode) {
        clearIncoming()
      }
    }

    const handleInviteError = (data: { message: string }) => {
      console.log('[ChessInvite] Invite error:', data)
      toast({
        title: "Chess Invite Error",
        description: data.message,
        variant: "destructive"
      })
    }

    const handleNavigate = (data: { roomCode: string, duration: number }) => {
      console.log('[ChessInvite] Navigating to room:', data)
      sessionStorage.setItem('chessSettings', JSON.stringify({ 
        duration: data.duration, 
        mode: 'invite', 
        roomCode: data.roomCode, 
        isHost: false 
      }))
      router.push(`/game/chess/room-${data.roomCode}?duration=${data.duration}&mode=invite&isHost=false`)
    }

    socket.on('chess:receive_invite', handleReceiveInvite)
    socket.on('receive_invite', handleReceiveGeneralInvite)
    socket.on('chess:invite_expired', handleInviteExpired)
    socket.on('chess:invite_error', handleInviteError)
    socket.on('chess:navigate_to_room', handleNavigate)

    return () => {
      console.log('[ChessInvite] Removing socket listeners')
      socket.off('chess:receive_invite', handleReceiveInvite)
      socket.off('receive_invite', handleReceiveGeneralInvite)
      socket.off('chess:invite_expired', handleInviteExpired)
      socket.off('chess:invite_error', handleInviteError)
      socket.off('chess:navigate_to_room', handleNavigate)
    }
  }, [isAuthenticated, token, toast, clearIncoming, router])

  // Countdown for incoming invite
  useEffect(() => {
    if (!incomingChessInvite) return

    const timer = setInterval(() => {
      setChessInviteTimeout(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          clearIncoming()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [incomingChessInvite, clearIncoming])

  const acceptChessInvite = useCallback(() => {
    if (!incomingChessInviteRef.current || !token) return
    const socket = getSocket(token)
    console.log('[ChessInvite] Accepting invite:', incomingChessInviteRef.current)
    socket.emit('chess:accept', { 
      senderId: incomingChessInviteRef.current.senderId,
      roomCode: incomingChessInviteRef.current.roomCode, 
      duration: incomingChessInviteRef.current.duration 
    })
    clearIncoming()
  }, [token, clearIncoming])

  const declineChessInvite = useCallback(() => {
    if (!incomingChessInviteRef.current || !token) return
    const socket = getSocket(token)
    console.log('[ChessInvite] Declining invite:', incomingChessInviteRef.current)
    socket.emit('chess:decline', { 
      senderId: incomingChessInviteRef.current.senderId,
      roomCode: incomingChessInviteRef.current.roomCode 
    })
    clearIncoming()
  }, [token, clearIncoming])

  return {
    incomingChessInvite,
    chessInviteTimeout,
    acceptChessInvite,
    declineChessInvite
  }
}
