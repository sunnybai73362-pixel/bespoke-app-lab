import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

type ChatRow = {
  id: string;
  user1: string;
  user2: string;
  last_message: string | null;
  last_message_at: string | null;
};

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  online?: boolean;
  last_seen?: string | null;
};

type LastMsgMeta = {
  id: string;
  chat_id: string;
  sender_id: string;
  delivered: boolean | null;
  read: boolean | null;
  created_at: string;
  content: string;
};

export default function Index() {
  const nav = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [peers, setPeers] = useState<Record<string, Profile>>({});
  const [lastMeta, setLastMeta] = useState<Record<string, LastMsgMeta | null>>({});
  const [loading, setLoading] = useState(true);

  // initial load + realtime
  useEffect(() => {
    const bootstrap = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const me = auth?.user?.id || null;
      setCurrentUserId(me);

      if (!me) {
        setLoading(false);
        return;
      }

      await loadChats(me);
      wireRealtime(me);
      setLoading(false);
    };
    bootstrap();

    return () => {
      supabase.removeAllChannels();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadChats = async (me: string) => {
    // fetch chats where I am user1 or user2
    const { data: rows1, error: e1 } = await supabase
      .from("chats")
      .select("id, user1, user2, last_message, last_message_at")
      .eq("user1", me)
      .order("last_message_at", { ascending: false });

    const { data: rows2, error: e2 } = await supabase
      .from("chats")
      .select("id, user1, user2, last_message, last_message_at")
      .eq("user2", me)
      .order("last_message_at", { ascending: false });

    if (e1 || e2) return;

    const merged = [...(rows1 || []), ...(rows2 || [])]
      .sort((a, b) => {
        const aT = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const bT = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return bT - aT;
      });

    setChats(merged);

    // load peer profiles and last message meta for each chat
    const peerIds = new Set<string>();
    merged.forEach((c) => {
      peerIds.add(c.user1 === me ? c.user2 : c.user1);
    });

    if (peerIds.size) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, online, last_seen")
        .in("id", Array.from(peerIds));
      const map: Record<string, Profile> = {};
      (profs || []).forEach((p) => (map[p.id] = p));
      setPeers(map);
    }

    // last message meta (to render ticks accurately)
    const metaMap: Record<string, LastMsgMeta | null> = {};
    for (const c of merged) {
      const { data: lm } = await supabase
        .from("messages")
        .select("id, chat_id, sender_id, delivered, read, created_at, content")
        .eq("chat_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      metaMap[c.id] = lm || null;
    }
    setLastMeta(metaMap);
  };

  const wireRealtime = (me: string) => {
    // new messages insert → update last meta and chat order
    const insertCh = supabase
      .channel("idx-msg-insert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as any;
          // update meta for that chat
          setLastMeta((prev) => ({
            ...prev,
            [msg.chat_id]: {
              id: msg.id,
              chat_id: msg.chat_id,
              sender_id: msg.sender_id,
              delivered: msg.delivered ?? true,
              read: msg.read ?? false,
              created_at: msg.created_at,
              content: msg.content,
            },
          }));
          // bump chat to top + set last_message fields locally
          setChats((prev) => {
            const updated = prev.map((c) =>
              c.id === msg.chat_id
                ? {
                    ...c,
                    last_message: msg.content,
                    last_message_at: msg.created_at,
                  }
                : c
            );
            // re-sort
            return [...updated].sort((a, b) => {
              const aT = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
              const bT = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
              return bT - aT;
            });
          });
        }
      )
      .subscribe();

    // messages update (read/delivered changes) → update tick
    const updateCh = supabase
      .channel("idx-msg-update")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as any;
          setLastMeta((prev) => {
            // only update if this updated msg is the last one for that chat
            const current = prev[msg.chat_id];
            if (current && current.id === msg.id) {
              return {
                ...prev,
                [msg.chat_id]: {
                  ...current,
                  delivered: msg.delivered ?? current.delivered,
                  read: msg.read ?? current.read,
                },
              };
            }
            return prev;
          });
        }
      )
      .subscribe();

    // profile updates (online/last_seen)
    const profCh = supabase
      .channel("idx-profiles")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const p = payload.new as any;
          setPeers((prev) => ({ ...prev, [p.id]: { ...prev[p.id], ...p } }));
        }
      )
      .subscribe();

    // chats update (last_message via trigger)
    const chatsCh = supabase
      .channel("idx-chats")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chats" },
        (payload) => {
          const c = payload.new as any;
          setChats((prev) => {
            const updated = prev.map((row) => (row.id === c.id ? { ...row, ...c } : row));
            return [...updated].sort((a, b) => {
              const aT = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
              const bT = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
              return bT - aT;
            });
          });
        }
      )
      .subscribe();

    // cleanup
    return () => {
      supabase.removeChannel(insertCh);
      supabase.removeChannel(updateCh);
      supabase.removeChannel(profCh);
      supabase.removeChannel(chatsCh);
    };
  };

  const renderTicks = (m: LastMsgMeta | null) => {
    if (!m || !currentUserId) return null;
    // only show ticks if I sent the last message
    if (m.sender_id !== currentUserId) return null;

    if (m.read) return <span className="text-blue-500">✓✓</span>;
    if (m.delivered) return <span className="text-gray-500">✓✓</span>;
    return <span className="text-gray-400">✓</span>;
  };

  const displayChats = useMemo(() => {
    if (!currentUserId) return [];
    return chats.map((c) => {
      const otherId = c.user1 === currentUserId ? c.user2 : c.user1;
      const peer = peers[otherId];
      const meta = lastMeta[c.id] || null;
      return { chat: c, peer, meta };
    });
  }, [chats, peers, lastMeta, currentUserId]);

  if (loading) {
    return <div className="p-6">Loading chats…</div>;
  }

  if (!currentUserId) {
    return (
      <div className="p-6">
        Please log in to view chats.
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col">
      <div className="p-4 border-b font-bold text-lg">Chats</div>

      <div className="flex-1 overflow-y-auto divide-y">
        {displayChats.length === 0 && (
          <div className="p-4 text-gray-500">No chats yet. Start one!</div>
        )}

        {displayChats.map(({ chat, peer, meta }) => (
          <button
            key={chat.id}
            onClick={() => nav(`/chat/${chat.id}`)}
            className="w-full text-left p-4 hover:bg-gray-50 flex items-center gap-3"
          >
            {/* avatar */}
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
              {peer?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={peer.avatar_url} alt={peer.username || ""} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm text-gray-600">
                  {(peer?.username || peer?.full_name || "U")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="font-medium truncate">
                  {peer?.full_name || peer?.username || "User"}
                </div>
                <div className="text-xs text-gray-500">
                  {chat.last_message_at
                    ? new Date(chat.last_message_at).toLocaleTimeString()
                    : ""}
                </div>
              </div>

              <div className="text-sm text-gray-600 flex items-center gap-1 truncate">
                {renderTicks(meta)}
                <span className="truncate">
                  {chat.last_message || meta?.content || "No messages yet"}
                </span>
              </div>

              <div className="text-xs text-gray-400">
                {peer?.online
                  ? "Online"
                  : peer?.last_seen
                  ? `last seen ${new Date(peer.last_seen).toLocaleTimeString()}`
                  : ""}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
              }      chatId = existing.id;
    } else {
      const { data: newChat } = await supabase
        .from("chats")
        .insert({ user1: user.id, user2: otherUserId })
        .select()
        .single();

      chatId = newChat?.id;
    }

    if (chatId) navigate(`/chat/${chatId}`);
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Search Users</h1>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search username"
          className="border p-2 rounded w-full"
        />
        <button
          onClick={searchUsers}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Search
        </button>
      </div>

      <ul className="space-y-2">
        {results.map((r) => (
          <li
            key={r.id}
            className="p-2 border rounded cursor-pointer hover:bg-gray-100"
            onClick={() => startChat(r.id)}
          >
            <span className="font-semibold">{r.username}</span> ({r.full_name})
          </li>
        ))}
      </ul>
    </div>
  );
        }    } else {
      const { data: newChat } = await supabase
        .from("chats")
        .insert({ user1: user.id, user2: otherUserId })
        .select()
        .single();

      chatId = newChat?.id;
    }

    if (chatId) navigate(`/chat/${chatId}`);
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Search Users</h1>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search username"
          className="border p-2 rounded w-full"
        />
        <button onClick={searchUsers} className="px-4 py-2 bg-blue-500 text-white rounded">
          Search
        </button>
      </div>

      <ul className="space-y-2">
        {results.map((r) => (
          <li
            key={r.id}
            className="p-2 border rounded cursor-pointer hover:bg-gray-100"
            onClick={() => startChat(r.id)}
          >
            <span className="font-semibold">{r.username}</span> ({r.full_name})
          </li>
        ))}
      </ul>
    </div>
  );
  }
