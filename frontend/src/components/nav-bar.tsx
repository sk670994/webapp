"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiRequest, type ApiUser } from "@/lib/api";

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    let mounted = true;
    apiRequest<{ user: ApiUser }>("/api/auth/me")
      .then((data) => {
        if (mounted) setUser(data.user);
      })
      .catch(() => {
        if (mounted) setUser(null);
      });

    return () => {
      mounted = false;
    };
  }, [pathname]);

  const navClass = (href: string) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${
      pathname === href ? "bg-white text-slate-900" : "text-slate-700 hover:bg-white/70"
    }`;

  const handleLogout = async () => {
    await apiRequest<null>("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex w-[min(1024px,92%)] items-center justify-between gap-4 py-4">
        <Link href="/dashboard" className="text-xl font-black tracking-tight text-slate-900">
          Posts Studio
        </Link>
        <nav className="flex flex-wrap items-center gap-1 rounded-full bg-slate-100 p-1">
          {user ? (
            <>
              <Link href="/dashboard" className={navClass("/dashboard")}>
                Dashboard
              </Link>
              <Link href="/create-post" className={navClass("/create-post")}>
                Create
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className={navClass("/admin")}>
                  Admin
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white/70"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={navClass("/login")}>
                Login
              </Link>
              <Link href="/signup" className={navClass("/signup")}>
                Signup
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
