import { useState, useEffect } from "react";
import { Send, Smile, Paperclip, Phone, Video, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMessages } from "@/hooks/useMessages";
import { useContacts } from "@/hooks/useContacts";
import { useAuth } from "@/contexts/AuthContext";


interface ChatWindowProps {
  selectedChatId?: string;
}

export const ChatWindow = ({ selectedChatId }: ChatWindowProps) => {
  const [newMessage, setNewMessage] = useState("");
  const { messages, sendMessage } = useMessages(selectedChatId);
  const { contacts } = useContacts();
  const { user } = useAuth();
  
  const currentContact = contacts.find(c => c.id === selectedChatId);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    await sendMessage(newMessage);
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!selectedChatId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-chat-background">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-32 h-32 mx-auto bg-gradient-primary rounded-full flex items-center justify-center shadow-glow">
              <span className="text-4xl font-bold text-primary-foreground">LE</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Welcome to LoftyEyes
          </h2>
          <p className="text-muted-foreground">Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-chat-background">
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-chat-sidebar/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={currentContact?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                {currentContact?.full_name.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{currentContact?.full_name || 'Unknown'}</h3>
              <p className={`text-sm ${currentContact?.online ? 'text-green-500' : 'text-muted-foreground'}`}>
                {currentContact?.online ? 'online' : 'offline'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 chat-scroll">
        <div className="space-y-4">
          {messages.map((message) => {
            const isMe = message.sender_id === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[70%] rounded-2xl p-3 message-bubble shadow-message
                    ${isMe 
                      ? 'bg-gradient-message text-chat-text-sent ml-12' 
                      : 'bg-chat-message-received text-chat-text-received mr-12'
                    }
                  `}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-2">
                    <span className="text-xs opacity-70">
                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      <div className="text-[10px] opacity-70 ml-2">
                        {message.read ? '✓✓' : '✓'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-chat-sidebar/50">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="pr-10 bg-background/50 border-border"
            />
            <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0">
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            onClick={handleSendMessage}
            className="h-8 w-8 p-0 bg-gradient-primary hover:bg-gradient-glow shadow-glow"
            disabled={!newMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};