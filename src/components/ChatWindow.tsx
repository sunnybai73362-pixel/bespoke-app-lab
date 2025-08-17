import { useState } from "react";
import { Send, Smile, Paperclip, Phone, Video, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  text: string;
  sender: "me" | "other";
  timestamp: string;
  status?: "sent" | "delivered" | "read";
}

const mockMessages: Message[] = [
  {
    id: "1",
    text: "Hey! How are you doing?",
    sender: "other",
    timestamp: "10:30 AM",
    status: "read"
  },
  {
    id: "2",
    text: "I'm doing great! Just working on some exciting projects. How about you?",
    sender: "me",
    timestamp: "10:32 AM",
    status: "read"
  },
  {
    id: "3",
    text: "That sounds awesome! I'd love to hear more about it. Maybe we can catch up over coffee this weekend?",
    sender: "other",
    timestamp: "10:35 AM",
    status: "read"
  },
  {
    id: "4",
    text: "Absolutely! I know a great place downtown. Let's plan it 😊",
    sender: "me",
    timestamp: "10:37 AM",
    status: "delivered"
  }
];

interface ChatWindowProps {
  selectedChatId?: string;
}

export const ChatWindow = ({ selectedChatId }: ChatWindowProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState(mockMessages);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: "me",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "sent"
    };
    
    setMessages([...messages, message]);
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
              <AvatarFallback className="bg-primary/20 text-primary font-semibold">SJ</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">Sarah Johnson</h3>
              <p className="text-sm text-green-500">online</p>
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
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[70%] rounded-2xl p-3 message-bubble shadow-message
                  ${message.sender === 'me' 
                    ? 'bg-gradient-message text-chat-text-sent ml-12' 
                    : 'bg-chat-message-received text-chat-text-received mr-12'
                  }
                `}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
                <div className="flex items-center justify-end gap-1 mt-2">
                  <span className="text-xs opacity-70">{message.timestamp}</span>
                  {message.sender === 'me' && (
                    <div className="flex">
                      <div className={`w-1 h-1 rounded-full ${
                        message.status === 'read' ? 'bg-blue-400' : 
                        message.status === 'delivered' ? 'bg-gray-400' : 'bg-gray-300'
                      }`}></div>
                      <div className={`w-1 h-1 rounded-full ml-0.5 ${
                        message.status === 'read' ? 'bg-blue-400' : 
                        message.status === 'delivered' ? 'bg-gray-400' : 'bg-gray-300'
                      }`}></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
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