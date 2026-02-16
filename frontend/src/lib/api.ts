export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
};

export type ApiPost = {
  _id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
};

type ApiError = {
  error?: string;
};

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/backend${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return null as T;
  }

  const payload = (await response.json()) as T & ApiError;

  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }

  return payload;
}
