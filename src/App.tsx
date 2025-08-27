import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Chat from "./pages/Chat";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/chat/:chatId" element={<ChatWrapper />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

function ChatWrapper() {
  const { chatId } = useParams();
  if (!chatId) return <div>No chat selected</div>;
  return <Chat chatId={chatId} />;
}  </QueryClientProvider>
);

export default App;

/* 🔹 Wrapper to read chatId from URL and pass into Chat.tsx */
import { useParams } from "react-router-dom";

function ChatWrapper() {
  const { chatId } = useParams();
  if (!chatId) return <div>No chat selected.</div>;
  return <Chat chatId={chatId} />;
}
