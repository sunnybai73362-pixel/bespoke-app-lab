import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext"; // ✅ Get logged in user

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  full_name: string;
  username: string;
}

const Chat = () => {
  const { user } = useAuth(); // ✅ Logged-in Supabase user
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Load existing messages
  useEffect(() => {
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, content, created_at, sender_id, profiles(full_name, username)")
        .order("created_at", { ascending: true });

      if (error) console.error("Error loading messages:", error);
      else {
        const mapped = data.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          created_at: msg.created_at,
          sender_id: msg.sender_id,
          full_name: msg.profiles?.full_name || "Unknown",
          username: msg.profiles?.username || "unknown",
        }));
        setMessages(mapped);
      }
    };

    loadMessages();

    // Subscribe to realtime
    const subscription = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as any;
          setMessages((prev) => [
            ...prev,
            {
              id: msg.id,
              content: msg.content,
              created_at: msg.created_at,
              sender_id: msg.sender_id,
              full_name: msg.full_name || "Unknown",
              username: msg.username || "unknown",
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Send new message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!user) {
      alert("You must be logged in to send messages!");
      return;
    }

    const { error } = await supabase.from("messages").insert({
      content: newMessage,
      sender_id: user.id, // ✅ Save logged-in user's UUID
    });

    if (error) console.error("Error sending message:", error);
    else setNewMessage("");
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">Chat</h1>
      <div className="border p-2 h-96 overflow-y-auto rounded">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-2">
            <span className="font-semibold">{msg.username}: </span>
            {msg.content}
          </div>
        ))}
      </div>
      <div className="mt-4 flex">
        <input
          type="text"
          className="border flex-1 p-2 rounded"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button
          onClick={sendMessage}
          className="ml-2 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data as Message[]);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { error } = await supabase.from("messages").insert([
      {
        content: newMessage,
        sender: "Me", // 👉 Replace with logged-in user later
      },
    ]);

    if (!error) setNewMessage("");
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-100">
      {/* Header */}
      <div className="p-4 text-center font-bold bg-blue-600 text-white">
        Chat Room 💬
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 rounded-lg max-w-xs ${
              msg.sender === "Me"
                ? "ml-auto bg-blue-500 text-white"
                : "mr-auto bg-gray-300 text-black"
            }`}
          >
            <p>{msg.content}</p>
            <span className="block text-xs opacity-70">
              {new Date(msg.created_at).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="flex items-center p-4 bg-white border-t"
      >
        <input
          type="text"
          className="flex-1 border rounded-lg px-3 py-2 mr-2"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;    ]);

    if (!error) setNewMessage("");
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <h2>💬 Chat Room</h2>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 10,
          height: 400,
          overflowY: "scroll",
          marginBottom: 10,
        }}
      >
        {messages.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.full_name}: </strong>
            <span>{msg.content}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default Chat;
