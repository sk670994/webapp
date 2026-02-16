"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export default function CreatePostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiRequest<{ post: { _id: string } }>("/api/posts", {
        method: "POST",
        body: JSON.stringify({ title, content }),
      });
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create post";
      if (msg.toLowerCase().includes("unauthorized")) {
        router.push("/login");
        return;
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold">Create Post</h1>
      <p className="mt-2 text-slate-600">Share something with the team.</p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
        />
        <textarea
          className="textarea min-h-40"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Content"
          required
        />
        {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
        <button type="submit" disabled={saving} className="btn">
          {saving ? "Saving..." : "Save Post"}
        </button>
      </form>
    </section>
  );
}
