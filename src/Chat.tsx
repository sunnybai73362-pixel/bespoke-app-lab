import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function Chat({ chatId }: { chatId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [typing, setTyping] = useState(false);

  /* 🔹 Load messages + realtime */
  useEffect(() => {
    if (!chatId) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*, profiles(full_name, username)")
        .eq("chat_id", chatId)
        .order("created_at");

      if (!error) setMessages(data || []);
    };

    loadMessages();

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const msg = payload.new as any;

          if (msg.sender_id !== user.id) {
            await supabase.from("messages").update({ delivered: true }).eq("id", msg.id);
          }

          setMessages((prev) => [...prev, msg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user]);

  /* 🔹 Mark as seen when chat is opened */
  useEffect(() => {
    if (!chatId || !user) return;
    supabase
      .from("messages")
      .update({ seen: true })
      .eq("chat_id", chatId)
      .neq("sender_id", user.id);
  }, [chatId, user]);

  /* 🔹 Fetch other user info */
  useEffect(() => {
    const fetchOtherUser = async () => {
      const { data: chat } = await supabase
        .from("chats")
        .select("user1, user2")
        .eq("id", chatId)
        .single();

      if (!chat) return;

      const otherId = chat.user1 === user.id ? chat.user2 : chat.user1;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, online, last_seen, typing")
        .eq("id", otherId)
        .single();

      setOtherUser(profile);
    };

    fetchOtherUser();

    // Subscribe to presence changes
    const channel = supabase
      .channel(`presence-${chatId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          if (payload.new.id === otherUser?.id) {
            setOtherUser(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user]);

  /* 🔹 Handle typing indicator */
  const handleTyping = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);

    // mark self as typing
    await supabase
      .from("profiles")
      .update({ typing: true })
      .eq("id", user.id);

    // stop typing after 2s
    setTimeout(async () => {
      await supabase.from("profiles").update({ typing: false }).eq("id", user.id);
    }, 2000);
  };

  const sendMessage = async () => {
    if (!content.trim() || !user) return;

    await supabase.from("messages").insert({
      chat_id: chatId,
      content,
      sender_id: user.id,
      delivered: false,
      seen: false,
    });

    setContent("");
    await supabase.from("profiles").update({ typing: false }).eq("id", user.id);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* 🔹 Chat Header */}
      <div className="p-3 border-b flex items-center bg-gray-50">
        {/* Avatar */}
        <img
          src={otherUser?.avatar_url || "https://ui-avatars.com/api/?name=" + (otherUser?.full_name || "User")}
          alt="avatar"
          className="w-10 h-10 rounded-full mr-3"
        />

        <div className="flex flex-col">
          <div className="font-semibold">{otherUser?.full_name}</div>
          <div className="text-sm text-gray-600">
            {otherUser?.typing
              ? "typing..."
              : otherUser?.online
              ? "Online"
              : otherUser?.last_seen
              ? `last seen at ${new Date(otherUser.last_seen).toLocaleTimeString()}`
              : "Offline"}
          </div>
        </div>
      </div>

      {/* 🔹 Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 rounded-lg max-w-xs ${
              msg.sender_id === user.id
                ? "bg-blue-500 text-white ml-auto"
                : "bg-gray-200"
            }`}
          >
            <div>{msg.content}</div>
            <div className="text-xs mt-1 text-right">
              {msg.seen
                ? "✅✅ (blue)"
                : msg.delivered
                ? "✅✅"
                : "✅"}
            </div>
          </div>
        ))}
      </div>

      {/* 🔹 Input */}
      <div className="p-3 flex border-t">
        <input
          type="text"
          value={content}
          onChange={handleTyping}
          className="flex-1 border rounded-lg p-2"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
                                                    }        setMessages(mapped);
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
