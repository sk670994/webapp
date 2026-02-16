"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, type ApiPost, type ApiUser } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [me, list] = await Promise.all([
          apiRequest<{ user: ApiUser }>("/api/auth/me"),
          apiRequest<{ posts: ApiPost[] }>("/api/posts"),
        ]);
        setUser(me.user);
        setPosts(list.posts);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load";
        if (msg.toLowerCase().includes("unauthorized")) {
          router.push("/login");
          return;
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [router]);

  if (loading) return <p className="text-slate-600">Loading dashboard...</p>;
  if (error) return <p className="text-rose-700">{error}</p>;

  return (
    <div className="space-y-4">
      <section className="panel p-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-slate-600">All posts are visible to authenticated users.</p>
      </section>

      {posts.length === 0 ? (
        <section className="panel p-6">
          <p className="text-slate-700">No posts yet. Start with a new one.</p>
        </section>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <article key={post._id} className="panel relative overflow-hidden p-6">
              <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-teal-600 to-cyan-500" />
              <h2 className="text-2xl font-bold text-slate-900">{post.title}</h2>
              <p className="mt-2 text-slate-700">{post.content}</p>
              <p className="mt-3 text-sm text-slate-500">By {post.authorName}</p>
              <p className="text-sm text-slate-500">Created {new Date(post.createdAt).toLocaleString()}</p>
              {post.updatedAt && post.updatedAt !== post.createdAt && (
                <p className="text-sm text-slate-500">Updated {new Date(post.updatedAt).toLocaleString()}</p>
              )}
              {user && user.id === post.authorId && (
                <Link href={`/edit-post/${post._id}`} className="mt-4 inline-block rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800">
                  Edit Post
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
