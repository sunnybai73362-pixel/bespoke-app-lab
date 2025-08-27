import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, username: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Ensure a profile exists for the authenticated user
  const ensureProfile = async (supaUser: User) => {
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', supaUser.id)
      .maybeSingle()

    if (fetchError) {
      console.error('Failed to check profile', fetchError)
      return
    }

    const fallback = supaUser.email?.split('@')[0] ?? 'user'
    const meta: any = supaUser.user_metadata || {}

    if (!existing) {
      const { error: insertError } = await supabase.from('profiles').insert([
        {
          id: supaUser.id,
          username: meta.username || fallback,
          full_name: meta.full_name || fallback,
          online: true,
        },
      ])
      if (insertError) {
        console.error('Failed to create profile', insertError)
      }
    } else {
      // Mark user online on login
      await supabase.from('profiles').update({ online: true }).eq('id', supaUser.id)
    }
  }

  useEffect(() => {
    // Listen for auth changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      if (session?.user) {
        setTimeout(() => {
          ensureProfile(session.user)
        }, 0)
      }
    })

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      if (session?.user) {
        setTimeout(() => {
          ensureProfile(session.user)
        }, 0)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, fullName: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName, username },
      },
    })

    if (error) throw error
  }

  const signOut = async () => {
    // Set user offline before signing out
    if (user) {
      await supabase
        .from('profiles')
        .update({ online: false })
        .eq('id', user.id)
    }
    
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}