import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string
          avatar_url: string | null
          updated_at: string
          online: boolean
        }
        Insert: {
          id: string
          username: string
          full_name: string
          avatar_url?: string | null
          updated_at?: string
          online?: boolean
        }
        Update: {
          id?: string
          username?: string
          full_name?: string
          avatar_url?: string | null
          updated_at?: string
          online?: boolean
        }
      }
      messages: {
        Row: {
          id: string
          content: string
          sender_id: string
          receiver_id: string
          created_at: string
          message_type: 'text' | 'image' | 'file'
          status: 'sent' | 'delivered' | 'read'
        }
        Insert: {
          id?: string
          content: string
          sender_id: string
          receiver_id: string
          created_at?: string
          message_type?: 'text' | 'image' | 'file'
          status?: 'sent' | 'delivered' | 'read'
        }
        Update: {
          id?: string
          content?: string
          sender_id?: string
          receiver_id?: string
          created_at?: string
          message_type?: 'text' | 'image' | 'file'
          status?: 'sent' | 'delivered' | 'read'
        }
      }
      conversations: {
        Row: {
          id: string
          participant_1: string
          participant_2: string
          last_message: string | null
          last_message_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          participant_1: string
          participant_2: string
          last_message?: string | null
          last_message_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          participant_1?: string
          participant_2?: string
          last_message?: string | null
          last_message_at?: string | null
          created_at?: string
        }
      }
    }
  }
}