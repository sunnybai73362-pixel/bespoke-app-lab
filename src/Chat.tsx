import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

const Chat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    const fetchMessages = async () => {
      const res = await fetch("/api/messages");
      const data = await res.json();
      setMessages(data);
    };

    fetchMessages();

    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: newMessage,
        sender_id: user.id,
        receiver_id: "receiver-id-here", // TODO: hook this dynamically
      }),
    });

    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-2 ${
              msg.sender_id === user.id ? "text-right" : "text-left"
            }`}
          >
            <div
              className={`inline-block p-2 rounded-lg ${
                msg.sender_id === user.id
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-black"
              }`}
            >
              {msg.content}
              <span className="ml-2 text-xs">
                {msg.read ? "✔✔" : "✔"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 flex border-t">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border rounded-lg px-3 py-2 mr-2"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;        .update({ delivered: true, read: true })
        .eq("chat_id", chatId)
        .neq("sender_id", user.id);
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

  const renderTick = (msg: Message) => {
    if (msg.read) return "✅✅"; // Read
    if (msg.delivered) return "✅"; // Delivered
    return "⏳"; // Pending
  };

  return (
    <div className="flex flex-col h-screen p-4">
      <div className="flex-1 overflow-y-auto space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 rounded-xl max-w-xs ${
              msg.sender_id === user?.id ? "bg-green-500 text-white ml-auto" : "bg-gray-200"
            }`}
          >
            <p>{msg.content}</p>
            <span className="text-xs opacity-70">{renderTick(msg)}</span>
          </div>
        ))}
      </div>

      <div className="flex mt-2">
        <input
          className="flex-1 border rounded-xl p-2"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="ml-2 bg-green-500 text-white px-4 rounded-xl"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;          }
        )
        .subscribe();

      // realtime: updates (read/delivered)
      const msgUpdateChannel = supabase
        .channel(`messages-update-${chatId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages" },
          (payload) => {
            if (payload.new.chat_id === chatId) {
              setMessages((prev) =>
                prev.map((m) => (m.id === payload.new.id ? payload.new : m))
              );
            }
          }
        )
        .subscribe();

      // realtime: typing via profiles
      const typingChannel = supabase
        .channel(`typing-${chatId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles" },
          (payload) => {
            if (payload.new.typing) {
              setTypingUser(payload.new.username);
            } else {
              setTypingUser(null);
            }
          }
        )
        .subscribe();

      cleanup = () => {
        supabase.removeChannel(msgInsertChannel);
        supabase.removeChannel(msgUpdateChannel);
        supabase.removeChannel(typingChannel);
      };
    })();

    return () => {
      cleanup?.();
    };
  }, [chatId]);

  const loadMessages = async (cid: string) => {
    const { data } = await supabase
      .from("messages")
      .select("id, content, sender_id, created_at, delivered, read, chat_id")
      .eq("chat_id", cid)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const fetchOtherUser = async (cid: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: chat } = await supabase
      .from("chats")
      .select("user1, user2")
      .eq("id", cid)
      .single();

    const otherUserId = chat?.user1 === user.id ? chat?.user2 : chat?.user1;

    if (otherUserId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, last_seen, online")
        .eq("id", otherUserId)
        .single();

      setOtherUser(profile);

      // mark all unread from them as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("chat_id", cid)
        .eq("sender_id", otherUserId)
        .eq("read", false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !chatId) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("messages").insert({
      chat_id: chatId,
      sender_id: user.id,
      content: input,
      delivered: true,
      read: false,
    });

    setInput("");
    await supabase.from("profiles").update({ typing: false }).eq("id", user.id);
  };

  const handleTyping = async (val: string) => {
    setInput(val);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ typing: val.length > 0 }).eq("id", user.id);
  };

  const renderTicks = (msg: any) => {
    if (msg.read) return <span className="text-blue-500">✓✓</span>;
    if (msg.delivered) return <span className="text-gray-500">✓✓</span>;
    return <span className="text-gray-400">✓</span>;
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="font-bold">{otherUser?.username || "Chat"}</div>
        <div className="text-sm text-gray-500">
          {otherUser?.online
            ? "Online"
            : otherUser?.last_seen
            ? `last seen at ${new Date(otherUser.last_seen).toLocaleTimeString()}`
            : "Offline"}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-2 rounded max-w-[70%] ${
              m.sender_id === currentUserId ? "bg-blue-100 self-end" : "bg-gray-100 self-start"
            }`}
          >
            <div>{m.content}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              {m.sender_id === currentUserId && renderTicks(m)}
              <span>{new Date(m.created_at).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
        {typingUser && (
          <div className="text-sm text-gray-400">{typingUser} is typing...</div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 border p-2 rounded"
        />
        <button onClick={sendMessage} className="px-4 py-2 bg-green-500 text-white rounded">
          Send
        </button>
      </div>
    </div>
  );
    }          }
        }
      )
      .subscribe();

    // listen for message updates (read/delivered changes)
    const msgUpdateChannel = supabase
      .channel("messages-update")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          if (payload.new.chat_id === chatId) {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? payload.new : m))
            );
          }
        }
      )
      .subscribe();

    // listen for typing updates
    const typingChannel = supabase
      .channel("typing")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          if (payload.new.typing) {
            setTypingUser(payload.new.username);
          } else {
            setTypingUser(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgInsertChannel);
      supabase.removeChannel(msgUpdateChannel);
      supabase.removeChannel(typingChannel);
    };
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("id, content, sender_id, created_at, delivered, read, chat_id")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const fetchOtherUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: chat } = await supabase
      .from("chats")
      .select("user1, user2")
      .eq("id", chatId)
      .single();

    const otherUserId = chat?.user1 === user.id ? chat?.user2 : chat?.user1;

    if (otherUserId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, last_seen, online")
        .eq("id", otherUserId)
        .single();

      setOtherUser(profile);

      // mark all unread messages from them as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("chat_id", chatId)
        .eq("sender_id", otherUserId)
        .eq("read", false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("messages").insert({
      chat_id: chatId,
      sender_id: user.id,
      content: input,
      delivered: true,
      read: false,
    });

    setInput("");
    await supabase.from("profiles").update({ typing: false }).eq("id", user.id);
  };

  const handleTyping = async (val: string) => {
    setInput(val);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ typing: val.length > 0 }).eq("id", user.id);
  };

  const renderTicks = (msg: any) => {
    if (msg.read) {
      return <span className="text-blue-500">✓✓</span>; // blue ticks
    }
    if (msg.delivered) {
      return <span className="text-gray-500">✓✓</span>; // gray double ticks
    }
    return <span className="text-gray-400">✓</span>; // single tick
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="font-bold">{otherUser?.username || "Chat"}</div>
        <div className="text-sm text-gray-500">
          {otherUser?.online
            ? "Online"
            : otherUser?.last_seen
            ? `last seen at ${new Date(otherUser.last_seen).toLocaleTimeString()}`
            : "Offline"}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-2 rounded max-w-[70%] ${
              m.sender_id === currentUserId
                ? "bg-blue-100 self-end"
                : "bg-gray-100 self-start"
            }`}
          >
            <div>{m.content}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              {renderTicks(m)}
              <span>{new Date(m.created_at).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
        {typingUser && (
          <div className="text-sm text-gray-400">{typingUser} is typing...</div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 border p-2 rounded"
        />
        <button onClick={sendMessage} className="px-4 py-2 bg-green-500 text-white rounded">
          Send
        </button>
      </div>
    </div>
  );
        }  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("messages").insert({
      chat_id: chatId,
      sender_id: user.id,
      content: input,
      delivered: true,
      read: false,
    });

    setInput("");
  };

  // Typing indicator
  const handleTyping = async (val: string) => {
    setInput(val);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ typing: val.length > 0 }).eq("id", user.id);
  };

  // Subscribe to typing
  useEffect(() => {
    const channel = supabase
      .channel("typing")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        if (payload.new.typing) {
          setTypingUser(payload.new.username);
        } else {
          setTypingUser(null);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={`p-2 rounded ${m.sender_id === "me" ? "bg-blue-100" : "bg-gray-100"}`}>
            <div>{m.content}</div>
            <div className="text-xs text-gray-500">
              {m.delivered ? "✓" : ""} {m.read ? "✓" : ""}
            </div>
          </div>
        ))}
        {typingUser && <div className="text-sm text-gray-400">{typingUser} is typing...</div>}
      </div>
      <div className="p-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 border p-2 rounded"
        />
        <button onClick={sendMessage} className="px-4 py-2 bg-green-500 text-white rounded">
          Send
        </button>
      </div>
    </div>
  );
}            await supabase.from("messages").update({ delivered: true }).eq("id", msg.id);
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
