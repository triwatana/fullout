"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CreateTeamPage() {
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const supabase = createClient();

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!teamName.trim()) {
      setError("Please enter a team name.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        name: teamName.trim(),
        created_by: user.id,
      })
      .select()
      .single();

    if (teamError) {
      setError(teamError.message);
      setLoading(false);
      return;
    }

    const { error: memberError } = await supabase.from("team_members").insert({
      team_id: team.id,
      user_id: user.id,
      role: "admin",
    });

    if (memberError) {
      setError(memberError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-white px-6 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8">
          <p className="text-sm font-medium text-gray-500">FullOut</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Create your team
          </h1>
          <p className="mt-2 text-gray-600">
            Set up your dance team workspace to get started.
          </p>
        </div>

        <form onSubmit={handleCreateTeam} className="space-y-5">
          <div>
            <label
              htmlFor="teamName"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Team name
            </label>

            <input
              id="teamName"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Criss Cross"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-black"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create team"}
          </button>
        </form>
      </div>
    </main>
  );
}
