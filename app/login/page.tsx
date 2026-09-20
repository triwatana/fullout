"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">FullOut</h1>
          <p className="mt-2 text-zinc-400">
            The workspace built for dance teams.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
          <h2 className="text-2xl font-semibold">Welcome back!</h2>

          <p className="mt-2 text-sm text-zinc-400">
            Log in to your team workspace.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">Email</label>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Password</label>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-400">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-white hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
