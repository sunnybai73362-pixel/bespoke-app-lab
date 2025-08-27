import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export default function Index() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const navigate = useNavigate();

  const searchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, full_name")
      .ilike("username", `%${query}%`);

    if (error) console.error(error);
    else setResults(data || []);
  };

  const startChat = async (otherUserId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: existing } = await supabase
      .from("chats")
      .select("*")
      .or(
        `and(user1.eq.${user.id},user2.eq.${otherUserId}),and(user1.eq.${otherUserId},user2.eq.${user.id})`
      )
      .maybeSingle();

    let chatId;
    if (existing) {
      chatId = existing.id;
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
