"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, type ApiPost, type ApiUser } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const me = await apiRequest<{ user: ApiUser }>("/api/auth/me");
      if (me.user.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      const list = await apiRequest<{ posts: ApiPost[] }>("/api/admin/posts");
      setPosts(list.posts);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load admin data";
      if (msg.toLowerCase().includes("unauthorized")) {
        router.push("/login");
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const deletePost = async (id: string) => {
    await apiRequest<null>(`/api/posts/${id}`, { method: "DELETE" });
    setPosts((current) => current.filter((post) => post._id !== id));
  };

  const deleteAll = async () => {
    await apiRequest<null>("/api/admin/posts", { method: "DELETE" });
    setPosts([]);
  };

  if (loading) return <p className="text-slate-600">Loading admin panel...</p>;
  if (error) return <p className="text-rose-700">{error}</p>;

  return (
    <div className="space-y-4">
      <section className="panel p-6">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="mt-2 text-slate-600">Moderate all posts from one place.</p>
        {posts.length > 0 && (
          <button onClick={deleteAll} className="btn btn-danger mt-4">
            Delete All Posts
          </button>
        )}
      </section>

      {posts.length === 0 ? (
        <section className="panel p-6">
          <p className="text-slate-700">No posts available.</p>
        </section>
      ) : (
        posts.map((post) => (
          <article key={post._id} className="panel p-6">
            <h2 className="text-2xl font-bold text-slate-900">{post.title}</h2>
            <p className="mt-2 text-slate-700">{post.content}</p>
            <p className="mt-3 text-sm text-slate-500">By {post.authorName}</p>
            <p className="text-sm text-slate-500">Created {new Date(post.createdAt).toLocaleString()}</p>
            {post.updatedAt && post.updatedAt !== post.createdAt && (
              <p className="text-sm text-slate-500">Updated {new Date(post.updatedAt).toLocaleString()}</p>
            )}
            <button onClick={() => deletePost(post._id)} className="btn btn-danger mt-4">
              Delete Post
            </button>
          </article>
        ))
      )}
    </div>
  );
}
