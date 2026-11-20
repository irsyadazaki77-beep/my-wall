"use client";

import { FormEvent, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

interface Post {
  id: number | string;
  author: string;
  message: string;
  created_at: string;
}

const MAX_CHARS = 280;

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [author, setAuthor] = useState("Zaki");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;

    const client = supabase;

    async function fetchPosts() {
      const { data, error: fetchError } = await client
        .from("posts")
        .select("id, author, message, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (fetchError) {
        setError("Failed to load posts: " + fetchError.message);
      } else if (data) {
        setPosts(data);
      }
      setLoading(false);
    }

    fetchPosts();

    const channel = client
      .channel("public:posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          const newPost = payload.new as Post;
          setPosts((prev) => {
            if (prev.some((p) => p.id === newPost.id)) return prev;
            return [newPost, ...prev].slice(0, 50);
          });
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedMessage = message.trim();
    const trimmedAuthor = author.trim() || "Guest";

    if (!trimmedMessage) return;
    if (!supabase) {
      setError("Supabase is not configured yet. Add your env variables first.");
      return;
    }

    setSubmitting(true);
    setError("");

    const { data, error: insertError } = await supabase
      .from("posts")
      .insert([{ author: trimmedAuthor, message: trimmedMessage }])
      .select("id, author, message, created_at")
      .single();

    if (insertError) {
      setError("Failed to share post: " + insertError.message);
    } else if (data) {
      setPosts((prev) => {
        if (prev.some((p) => p.id === data.id)) return prev;
        return [data, ...prev].slice(0, 50);
      });
      setMessage("");
    }

    setSubmitting(false);
  }

  const remainingChars = MAX_CHARS - message.length;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#3b5998] text-white border-b border-[#29487d]">
        <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight">wall</span>
            <span className="text-xs text-blue-200 hidden sm:inline">
              2008 Edition
            </span>
          </div>
          <div className="text-xs text-blue-100">Home &bull; Profile &bull; Wall</div>
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <aside className="md:col-span-1 space-y-4">
          <div className="bg-white border border-gray-300 rounded-sm p-4">
            <div className="w-full aspect-square max-w-[180px] mx-auto bg-[#d8dfea] border border-[#bdc7d8] flex items-center justify-center mb-3">
              <svg
                className="w-24 h-24 text-[#627aad]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-[#3b5998] text-center md:text-left">
              Zaki&apos;s Wall
            </h1>
            <p className="text-xs text-gray-500 text-center md:text-left mt-0.5">
              Learning React &amp; Next.js
            </p>
          </div>

          <div className="bg-white border border-gray-300 rounded-sm overflow-hidden">
            <div className="bg-[#f2f2f2] border-b border-gray-300 px-3 py-1.5 text-xs font-bold text-[#333333]">
              Information
            </div>
            <div className="p-3 text-xs space-y-2 text-gray-700">
              <div>
                <span className="text-gray-500 block">Networks:</span>
                <span>Indonesia</span>
              </div>
              <div>
                <span className="text-gray-500 block">Current City:</span>
                <span>Jakarta</span>
              </div>
              <div>
                <span className="text-gray-500 block">Status:</span>
                <span>Building cool web apps</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="md:col-span-2 space-y-4">
          <div className="bg-white border border-gray-300 rounded-sm p-4">
            <h2 className="text-sm font-bold text-[#333333] mb-3 border-b border-gray-200 pb-2">
              Wall
            </h2>

            {!isSupabaseConfigured && (
              <div className="mb-3 p-2.5 bg-yellow-50 border border-yellow-300 text-yellow-800 text-xs rounded-sm">
                Supabase env variables are missing. Add{" "}
                <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
                <code>.env.local</code>.
              </div>
            )}

            {error && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-300 text-red-700 text-xs rounded-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div>
                <label
                  htmlFor="author"
                  className="block text-xs font-semibold text-gray-600 mb-1"
                >
                  Name
                </label>
                <input
                  id="author"
                  type="text"
                  maxLength={40}
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-[#bdc7d8] px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#3b5998]"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-xs font-semibold text-gray-600 mb-1"
                >
                  Write something...
                </label>
                <textarea
                  id="message"
                  rows={3}
                  maxLength={MAX_CHARS}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full border border-[#bdc7d8] px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:border-[#3b5998]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span
                  className={`text-xs ${
                    remainingChars <= 20 ? "text-red-600 font-semibold" : "text-gray-500"
                  }`}
                >
                  {remainingChars} characters left
                </span>
                <button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  className="bg-[#5b74a8] hover:bg-[#4c66a4] disabled:opacity-50 text-white text-xs font-bold px-4 py-1.5 border border-[#29447e] cursor-pointer disabled:cursor-default"
                >
                  {submitting ? "Sharing..." : "Share"}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white border border-gray-300 rounded-sm">
            <div className="bg-[#f2f2f2] border-b border-gray-300 px-4 py-2 text-xs font-bold text-[#333333] flex justify-between items-center">
              <span>Wall Posts</span>
              <span className="font-normal text-gray-500">
                {posts.length} {posts.length === 1 ? "post" : "posts"}
              </span>
            </div>

            {loading ? (
              <div className="p-6 text-center text-xs text-gray-500">
                Loading posts...
              </div>
            ) : posts.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                No posts yet. Be the first to write on the wall!
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {posts.map((post) => (
                  <article key={post.id} className="p-4 flex gap-3">
                    <div className="w-10 h-10 shrink-0 bg-[#d8dfea] border border-[#bdc7d8] flex items-center justify-center text-sm font-bold text-[#3b5998]">
                      {post.author.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-bold text-[#3b5998]">
                          {post.author}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {formatDate(post.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap break-words">
                        {post.message}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
