import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface Message {
  id: string
  content: string
  sender_id: string
  receiver_id: string
  created_at: string
  message_type: 'text' | 'image' | 'file'
  status: 'sent' | 'delivered' | 'read'
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
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${conversationPartnerId}),and(sender_id.eq.${conversationPartnerId},receiver_id.eq.${user.id}))`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, payload.new as Message])
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === payload.new.id ? payload.new as Message : msg
              )
            )
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
      .insert([{
        content: content.trim(),
        sender_id: user.id,
        receiver_id: conversationPartnerId,
        message_type: 'text',
        status: 'sent'
      }])

    if (error) {
      console.error('Error sending message:', error)
    }

    // Update or create conversation
    await supabase
      .from('conversations')
      .upsert({
        participant_1: user.id < conversationPartnerId ? user.id : conversationPartnerId,
        participant_2: user.id < conversationPartnerId ? conversationPartnerId : user.id,
        last_message: content.trim(),
        last_message_at: new Date().toISOString()
      })
  }

  return {
    messages,
    loading,
    sendMessage
  }
}