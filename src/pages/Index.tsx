import { useState } from "react";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatWindow } from "@/components/ChatWindow";
import { useAuth } from "@/contexts/AuthContext";
import Auth from "@/pages/Auth";

const Index = () => {
  const [selectedChatId, setSelectedChatId] = useState<string>();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-chat-background">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-primary rounded-full flex items-center justify-center shadow-glow mb-4 animate-pulse">
            <span className="text-xl font-bold text-primary-foreground">LE</span>
          </div>
          <p className="text-muted-foreground">Loading LoftyEyes...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="h-screen flex bg-chat-background overflow-hidden">
      {/* Mobile-first responsive layout */}
      <div className="hidden md:block md:w-80 lg:w-96">
        <ChatSidebar 
          selectedChatId={selectedChatId}
          onChatSelect={setSelectedChatId}
        />
      </div>
      
      {/* Mobile: Show sidebar or chat based on selection */}
      <div className="flex-1 md:hidden">
        {selectedChatId ? (
          <div className="h-full flex flex-col">
            {/* Mobile back button */}
            <div className="p-2 border-b border-border bg-chat-sidebar">
              <button 
                onClick={() => setSelectedChatId(undefined)}
                className="text-primary hover:text-primary-glow transition-colors"
              >
                ← Back to chats
              </button>
            </div>
            <div className="flex-1">
              <ChatWindow selectedChatId={selectedChatId} />
            </div>
          </div>
        ) : (
          <ChatSidebar 
            selectedChatId={selectedChatId}
            onChatSelect={setSelectedChatId}
          />
        )}
      </div>
      
      {/* Desktop chat window */}
      <div className="hidden md:flex flex-1">
        <ChatWindow selectedChatId={selectedChatId} />
      </div>
    </div>
  );
};

export default Index;
