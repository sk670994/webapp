"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest, type ApiPost } from "@/lib/api";

export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiRequest<{ post: ApiPost }>(`/api/posts/${params.id}`);
        setTitle(data.post.title);
        setContent(data.post.content);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load post";
        if (msg.toLowerCase().includes("unauthorized")) {
          router.push("/login");
          return;
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) void load();
  }, [params.id, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiRequest<{ post: ApiPost }>(`/api/posts/${params.id}`, {
        method: "PUT",
        body: JSON.stringify({ title, content }),
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-600">Loading post...</p>;

  return (
    <section className="panel mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold">Edit Post</h1>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea className="textarea min-h-40" value={content} onChange={(e) => setContent(e.target.value)} required />
        {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
        <button type="submit" disabled={saving} className="btn">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </section>
  );
}
