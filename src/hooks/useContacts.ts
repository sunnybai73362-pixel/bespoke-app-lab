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
      
      // Step 1: Fetch conversations for current user
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id, participant_1, participant_2, last_message, last_message_at')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false })

      if (convError) {
        console.error('Error fetching contacts:', convError)
        setLoading(false)
        return
      }

      const otherIds = Array.from(
        new Set(
          (conversations || []).map((c: any) =>
            c.participant_1 === user.id ? c.participant_2 : c.participant_1
          )
        )
      )

      if (otherIds.length === 0) {
        setContacts([])
        setLoading(false)
        return
      }

      // Step 2: Fetch profiles for those users
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, online')
        .in('id', otherIds)

      if (profError) {
        console.error('Error fetching profiles:', profError)
        setLoading(false)
        return
      }

      const profileMap: Record<string, any> = {}
      ;(profiles || []).forEach((p: any) => {
        profileMap[p.id] = p
      })

      const contactsData = (conversations || []).map((conv: any) => {
        const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1
        const other = profileMap[otherId]
        return {
          id: other?.id || otherId,
          username: other?.username || 'Unknown',
          full_name: other?.full_name || 'Unknown User',
          avatar_url: other?.avatar_url || null,
          online: !!other?.online,
          last_message: conv.last_message,
          last_message_at: conv.last_message_at,
          unread_count: 0 // TODO: Implement unread count logic
        }
      })

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
        },
        (payload) => {
          const row: any = (payload as any).new || (payload as any).old
          if (!row) return
          const involved = row.participant_1 === user.id || row.participant_2 === user.id
          if (involved) {
            fetchContacts() // Refetch on conversation changes
          }
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