"use client";

import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

interface Message {
  id: string;
  chat_id: string;
  sender_id: string | null;
  receiver_id: string | null;
  content: string;
  created_at: string;
  read: boolean;
}

interface ChatProps {
  chatId: string;
  currentUserId: string;
}

export default function Chat({ chatId, currentUserId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Fetch messages
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error.message);
    } else {
      setMessages(data as Message[]);
      markMessagesAsRead(data as Message[]);
    }
  };

  // Mark all received messages as read
  const markMessagesAsRead = async (msgs: Message[]) => {
    const unread = msgs.filter(
      (m) => m.sender_id !== currentUserId && !m.read
    );

    if (unread.length > 0) {
      const ids = unread.map((m) => m.id);
      const { error } = await supabase
        .from("messages")
        .update({ read: true })
        .in("id", ids);

      if (error) console.error("Error updating read:", error.message);
    }
  };

  // Send new message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: uuidv4(),
      chat_id: chatId,
      sender_id: currentUserId,
      receiver_id: null,
      content: newMessage,
      created_at: new Date().toISOString(),
      read: false,
    };

    setMessages((prev) => [...prev, message]); // Optimistic UI

    const { error } = await supabase.from("messages").insert(message);
    if (error) console.error("Error sending message:", error.message);

    setNewMessage("");
  };

  // Realtime subscription
  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel("chat-room")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            const updated = [...prev, newMsg];
            markMessagesAsRead(updated);
            return updated;
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`px-3 py-2 rounded-2xl shadow text-sm max-w-xs ${
                  isMine
                    ? "bg-blue-500 text-white rounded-br-none"
                    : "bg-white text-gray-800 rounded-bl-none"
                }`}
              >
                <p>{msg.content}</p>
                <span className="text-[10px] text-gray-300 block mt-1">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {isMine && (msg.read ? " ✅✅" : " ✅")}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-white flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded-full shadow"
        >
          Send
        </button>
      </div>
    </div>
  );
}
