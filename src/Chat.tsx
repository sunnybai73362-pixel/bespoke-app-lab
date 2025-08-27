"use client";

import { useEffect, useState } from "react";
import { supabase } from "./integration/supabase/client";
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
  currentUserId: string; // pass this from auth context or props
}

export default function Chat({ chatId, currentUserId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Fetch messages for this chat
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
    }
  };

  // Send new message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: uuidv4(),
      chat_id: chatId,
      sender_id: currentUserId,
      receiver_id: null, // you can set if needed
      content: newMessage,
      created_at: new Date().toISOString(),
      read: false,
    };

    setMessages((prev) => [...prev, message]); // Optimistic UI

    const { error } = await supabase.from("messages").insert(message);
    if (error) console.error("Error sending message:", error.message);

    setNewMessage("");
  };

  // Subscribe to realtime messages
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
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Messages List */}
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
                  {isMine &&
                    (msg.read ? " ✅✅" : " ✅")}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Box */}
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
}  // Mark messages as delivered/read
  useEffect(() => {
    const markAsRead = async () => {
      if (!user) return;

      await supabase
        .from("messages")
        .update({ delivered: true, read: true })
        .eq("chat_id", chatId)
        .neq("sender_id", user.id); // don’t mark own messages
    };

    markAsRead();
  }, [chatId, user]);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const { error } = await supabase.from("messages").insert([
      {
        chat_id: chatId,
        sender_id: user.id,
        content: newMessage.trim(),
        delivered: true,
        read: false,
      },
    ]);

    if (error) console.error(error);
    else setNewMessage("");
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="border rounded-lg p-3 h-80 overflow-y-auto bg-white shadow">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-2">
            <p className="text-gray-800">{msg.content}</p>
            <span className="text-xs text-gray-500">
              {msg.read ? "✓✓ Read" : msg.delivered ? "✓✓ Delivered" : "✓ Sent"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 border rounded-lg p-2"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
