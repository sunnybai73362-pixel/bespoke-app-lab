import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface Contact {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  online: boolean
  last_message?: string
  last_message_at?: string
  unread_count?: number
}

export const useContacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const fetchContacts = async () => {
      setLoading(true)
      
      // Get conversations with contact details
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participant_1_profile:profiles!conversations_participant_1_fkey(*),
          participant_2_profile:profiles!conversations_participant_2_fkey(*)
        `)
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false })

      if (error) {
        console.error('Error fetching contacts:', error)
        setLoading(false)
        return
      }

      // Transform conversations to contacts
      const contactsData = conversations?.map(conv => {
        const otherParticipant = conv.participant_1 === user.id 
          ? conv.participant_2_profile 
          : conv.participant_1_profile
          
        return {
          id: otherParticipant.id,
          username: otherParticipant.username,
          full_name: otherParticipant.full_name,
          avatar_url: otherParticipant.avatar_url,
          online: otherParticipant.online,
          last_message: conv.last_message,
          last_message_at: conv.last_message_at,
          unread_count: 0 // TODO: Implement unread count logic
        }
      }) || []

      setContacts(contactsData)
      setLoading(false)
    }

    fetchContacts()

    // Subscribe to real-time updates for profiles
    const profilesChannel = supabase
      .channel('profiles_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          setContacts(prev => 
            prev.map(contact => 
              contact.id === payload.new.id 
                ? { ...contact, online: payload.new.online }
                : contact
            )
          )
        }
      )
      .subscribe()

    // Subscribe to conversation updates
    const conversationsChannel = supabase
      .channel('conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `or(participant_1.eq.${user.id},participant_2.eq.${user.id})`
        },
        () => {
          fetchContacts() // Refetch on conversation changes
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(profilesChannel)
      supabase.removeChannel(conversationsChannel)
    }
  }, [user])

  return {
    contacts,
    loading
  }
}