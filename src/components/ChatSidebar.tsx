import { useEffect, useState } from "react";
import { Search, MessageCircle, Users, Settings, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useContacts, Contact } from "@/hooks/useContacts";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface ChatSidebarProps {
  selectedChatId?: string;
  onChatSelect: (chatId: string) => void;
}

export const ChatSidebar = ({ selectedChatId, onChatSelect }: ChatSidebarProps) => {
  const { contacts, loading } = useContacts();
  const { signOut, user } = useAuth();
  const { toast } = useToast();

  // New chat modal state
  const [openNewChat, setOpenNewChat] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; full_name: string; username: string; avatar_url: string | null }>>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!openNewChat) return;
    const t = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      try {
        setSearching(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .neq('id', user?.id || '')
          .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
          .limit(20);
        if (error) throw error;
        setResults(data || []);
      } catch (err) {
        console.error(err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, openNewChat, user?.id]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Goodbye!",
        description: "You've successfully signed out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };
  return (
    <div className="w-full h-full bg-chat-sidebar border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            LoftyEyes
          </h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Users className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search chats..."
            className="pl-10 bg-background/50 border-border"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto chat-scroll">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading contacts...
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No conversations yet. Start a new chat!
          </div>
        ) : (
          contacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => onChatSelect(contact.id)}
              className={`
                p-4 cursor-pointer transition-colors hover:bg-accent/50
                ${selectedChatId === contact.id ? 'bg-accent' : ''}
                border-b border-border/50
              `}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={contact.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                      {contact.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {contact.online && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-chat-sidebar"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm truncate">{contact.full_name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {contact.last_message_at ? 
                        new Date(contact.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
                        ''
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate">
                      {contact.last_message || 'No messages yet'}
                    </p>
                    {contact.unread_count && contact.unread_count > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {contact.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button className="w-full bg-gradient-primary hover:bg-gradient-glow shadow-glow" onClick={() => setOpenNewChat(true)}>
          <MessageCircle className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={openNewChat} onOpenChange={setOpenNewChat}>
        <DialogContent className="bg-chat-sidebar border-border">
          <DialogHeader>
            <DialogTitle>Start a new chat</DialogTitle>
            <DialogDescription>Search for a user to start messaging.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or username..."
              className="bg-background/50 border-border"
            />
            <div className="max-h-64 overflow-y-auto chat-scroll divide-y divide-border/50">
              {searching && <div className="p-3 text-sm text-muted-foreground">Searching...</div>}
              {!searching && results.length === 0 && query && (
                <div className="p-3 text-sm text-muted-foreground">No users found.</div>
              )}
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={async () => {
                    if (!user) return;
                    try {
                      setCreating(true);
                      // Check for existing conversation (both orders)
                      const { data: existing } = await supabase
                        .from('conversations')
                        .select('id')
                        .or(`and(participant_1.eq.${user.id},participant_2.eq.${r.id}),and(participant_1.eq.${r.id},participant_2.eq.${user.id})`)
                        .maybeSingle();

                      let convoId = existing?.id;
                      if (!convoId) {
                        const { data: inserted, error: insertError } = await supabase
                          .from('conversations')
                          .insert({ participant_1: user.id, participant_2: r.id })
                          .select('id')
                          .single();
                        if (insertError) throw insertError;
                        convoId = inserted.id;
                      }

                      setOpenNewChat(false);
                      setQuery("");
                      onChatSelect(r.id); // select by user id for ChatWindow
                    } catch (err: any) {
                      toast({ title: 'Error', description: err.message || 'Failed to start chat', variant: 'destructive' });
                    } finally {
                      setCreating(false);
                    }
                  }}
                  className="w-full text-left p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={r.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                      {r.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium leading-tight">{r.full_name}</div>
                    <div className="text-xs text-muted-foreground">@{r.username}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpenNewChat(false)} disabled={creating}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};