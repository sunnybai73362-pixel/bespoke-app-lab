import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface Message {
  id: string
  content: string
  sender_id: string
  receiver_id: string | null
  created_at: string
  read: boolean
  chat_id?: string | null
}

export const useMessages = (conversationPartnerId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (!user || !conversationPartnerId) return

    const fetchMessages = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${conversationPartnerId}),and(sender_id.eq.${conversationPartnerId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
      } else {
        setMessages(data || [])
      }
      setLoading(false)
    }

    fetchMessages()

    // Subscribe to real-time message updates
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new as Message | null;
          if (!m) return;
          const isThisChat =
            (m.sender_id === user.id && m.receiver_id === conversationPartnerId) ||
            (m.sender_id === conversationPartnerId && m.receiver_id === user.id);
          if (!isThisChat) return;
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, m]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(msg => (msg.id === m.id ? m : msg)));
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, conversationPartnerId])

  const sendMessage = async (content: string) => {
    if (!user || !conversationPartnerId || !content.trim()) return

    const { error } = await supabase
      .from('messages')
      .insert([
        {
          content: content.trim(),
          sender_id: user.id,
          receiver_id: conversationPartnerId,
        },
      ])

    if (error) {
      console.error('Error sending message:', error)
    }

    // Update or create conversation (normalized order with onConflict)
    const p1 = user.id < conversationPartnerId ? user.id : conversationPartnerId
    const p2 = user.id < conversationPartnerId ? conversationPartnerId : user.id
    await supabase
      .from('conversations')
      .upsert(
        { participant_1: p1, participant_2: p2, last_message: content.trim(), last_message_at: new Date().toISOString() },
        { onConflict: 'participant_1,participant_2' }
      )
  }

  return {
    messages,
    loading,
    sendMessage
  }
}