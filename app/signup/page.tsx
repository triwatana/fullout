"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/onboarding");
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">FullOut</h1>
          <p className="mt-2 text-zinc-400">
            The workspace built for dance teams.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
          <h2 className="text-2xl font-semibold">Create your account</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Join your dance team on FullOut.
          </p>

          <form onSubmit={handleSignUp} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">Name</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white"
              />
            </div>

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
                placeholder="At least 6 characters"
                minLength={6}
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
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-white hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
