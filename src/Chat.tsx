import React, { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  delivered: boolean;
  read: boolean;
}

interface ChatProps {
  chatId: string;
  user: { id: string };
}

const Chat: React.FC<ChatProps> = ({ chatId, user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Fetch messages initially
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId);

      if (error) console.error(error);
      else setMessages(data || []);
    };

    fetchMessages();
  }, [chatId]);

  // Mark messages as delivered/read
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
