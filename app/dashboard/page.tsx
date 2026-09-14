"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Team = {
  id: string;
  name: string;
};

export default function DashboardPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function loadDashboard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: teamData } = await supabase
        .from("teams")
        .select("id, name")
        .eq("created_by", user.id)
        .single();

      if (teamData) {
        setTeam(teamData);

        const { count } = await supabase
          .from("team_members")
          .select("*", { count: "exact", head: true })
          .eq("team_id", teamData.id);

        setMemberCount(count ?? 0);
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <p className="text-gray-500">Loading FullOut...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">FullOut</p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">Dashboard</h1>
          </div>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Log out
          </button>
        </header>

        {!team ? (
          <div className="rounded-xl border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900">
              Welcome to FullOut
            </h2>

            <p className="mt-2 text-gray-600">
              Create your dance team to get started.
            </p>

            <a
              href="/team/create"
              className="mt-6 inline-block rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800"
            >
              Create team
            </a>
          </div>
        ) : (
          <>
            <div className="mb-8 rounded-xl border border-gray-200 p-8">
              <p className="text-sm font-medium text-gray-500">Your team</p>

              <h2 className="mt-2 text-3xl font-bold text-gray-900">
                {team.name}
              </h2>

              <p className="mt-2 text-gray-600">Your dance team workspace.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 p-6">
                <p className="text-sm text-gray-500">Members</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {memberCount}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-6">
                <p className="text-sm text-gray-500">Routines</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
              </div>

              <div className="rounded-xl border border-gray-200 p-6">
                <p className="text-sm text-gray-500">Corrections</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <a
                href="/members"
                className="rounded-xl border border-gray-200 p-6 hover:bg-gray-50"
              >
                <h3 className="font-semibold text-gray-900">Team members</h3>
                <p className="mt-1 text-sm text-gray-600">
                  View and manage your dancers.
                </p>
              </a>

              <div className="rounded-xl border border-dashed border-gray-300 p-6">
                <h3 className="font-semibold text-gray-400">Routines</h3>
                <p className="mt-1 text-sm text-gray-400">Coming next.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
