"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <h1 className="text-2xl font-bold">FullOut</h1>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
          >
            Log out
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Dashboard
        </p>

        <h2 className="mt-2 text-4xl font-bold tracking-tight">
          Welcome to FullOut
        </h2>

        <p className="mt-3 max-w-xl text-zinc-400">
          Your dance team workspace. Routines, rehearsals, corrections, and
          everything your team needs in one place.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-500">Team</p>
            <p className="mt-2 text-xl font-semibold">Your Team</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-500">Members</p>
            <p className="mt-2 text-xl font-semibold">0</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-500">Routines</p>
            <p className="mt-2 text-xl font-semibold">0</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-500">Corrections</p>
            <p className="mt-2 text-xl font-semibold">0</p>
          </div>
        </div>
      </div>
    </main>
  );
}
