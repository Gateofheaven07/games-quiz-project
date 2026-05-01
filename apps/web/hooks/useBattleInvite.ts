'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSocket } from './useSocket'
import { useToast } from './use-toast'

export function useBattleInvite() {
  const { socket } = useSocket()
  const { toast } = useToast()
  
  // State for sending invites
  const [invitingId, setInvitingId] = useState<string | null>(null)
  
  // State for incoming invite
  const [incomingInvite, setIncomingInvite] = useState<any | null>(null)
  const [inviteTimeout, setInviteTimeout] = useState<number>(30)

  // Clear incoming invite
  const clearIncoming = useCallback(() => {
    setIncomingInvite(null)
    setInviteTimeout(30)
  }, [])

  useEffect(() => {
    if (!socket) return

    // --- Outgoing Events ---
    const handleInviteSent = (data: any) => {
      // Invite successfully registered on server
      // Button state can stay as "Menunggu..." until timeout or response
    }

    const handleInviteTimeout = (data: { receiverId: string }) => {
      if (invitingId === data.receiverId) {
        setInvitingId(null)
        toast({
          title: "Undangan Kedaluwarsa",
          description: "Teman tidak merespons undangan Anda.",
          variant: "destructive"
        })
      }
    }

    const handleInviteDeclined = (data: { receiverId: string }) => {
      if (invitingId === data.receiverId) {
        setInvitingId(null)
        toast({
          title: "Undangan Ditolak",
          description: "Teman menolak tantangan Anda.",
          variant: "destructive"
        })
      }
    }

    const handleInviteError = (data: { message: string }) => {
      setInvitingId(null)
      toast({
        title: "Gagal Mengundang",
        description: data.message,
        variant: "destructive"
      })
    }

    // --- Incoming Events ---
    const handleReceiveInvite = (notification: any) => {
      setIncomingInvite(notification)
      setInviteTimeout(30)
    }

    const handleInviteExpired = (data: { roomId: string }) => {
      if (incomingInvite?.roomId === data.roomId) {
        clearIncoming()
      }
    }

    socket.on('battle:invite_sent', handleInviteSent)
    socket.on('battle:invite_timeout', handleInviteTimeout)
    socket.on('battle:invite_declined', handleInviteDeclined)
    socket.on('battle:invite_error', handleInviteError)
    socket.on('receive_invite', handleReceiveInvite)
    socket.on('battle:invite_expired', handleInviteExpired)

    return () => {
      socket.off('battle:invite_sent', handleInviteSent)
      socket.off('battle:invite_timeout', handleInviteTimeout)
      socket.off('battle:invite_declined', handleInviteDeclined)
      socket.off('battle:invite_error', handleInviteError)
      socket.off('receive_invite', handleReceiveInvite)
      socket.off('battle:invite_expired', handleInviteExpired)
    }
  }, [socket, invitingId, incomingInvite, toast, clearIncoming])

  // Countdown for incoming invite
  useEffect(() => {
    if (!incomingInvite) return

    const timer = setInterval(() => {
      setInviteTimeout(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          clearIncoming()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [incomingInvite, clearIncoming])

  const sendInvite = useCallback((receiverId: string, categoryId: number) => {
    if (!socket) return
    setInvitingId(receiverId)
    socket.emit('battle:invite', { receiverId, categoryId })
  }, [socket])

  const acceptInvite = useCallback(() => {
    if (!socket || !incomingInvite) return
    socket.emit('battle:accept', { 
      roomId: incomingInvite.roomId, 
      notificationId: incomingInvite.id 
    })
    clearIncoming()
  }, [socket, incomingInvite, clearIncoming])

  const declineInvite = useCallback(() => {
    if (!socket || !incomingInvite) return
    socket.emit('battle:decline', { 
      roomId: incomingInvite.roomId, 
      notificationId: incomingInvite.id 
    })
    clearIncoming()
  }, [socket, incomingInvite, clearIncoming])

  return {
    invitingId,
    sendInvite,
    incomingInvite,
    inviteTimeout,
    acceptInvite,
    declineInvite
  }
}
