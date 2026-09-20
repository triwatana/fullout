"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppNav from "@/app/components/AppNav";

type Team = {
  id: string;
  name: string;
};

type Membership = {
  team_id: string;
  role: string;
};

type SetRow = {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  season: string | null;
  season_year: number | null;
  created_by: string;
  created_at: string;
};

const seasons = ["Spring", "Summer", "Fall"];

export default function SetsPage() {
  const supabase = createClient();

  const [team, setTeam] = useState<Team | null>(null);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [role, setRole] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [season, setSeason] = useState("Fall");
  const [seasonYear, setSeasonYear] = useState(
    new Date().getFullYear().toString(),
  );

  useEffect(() => {
    loadSets();
  }, []);

  async function loadSets() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    let activeTeamId = localStorage.getItem("fullout_active_team");

    const { data: memberships, error: membershipError } = await supabase
      .from("team_members")
      .select("team_id, role")
      .eq("user_id", user.id);

    if (membershipError) {
      setError(membershipError.message);
      setLoading(false);
      return;
    }

    const membershipRows = (memberships || []) as Membership[];

    if (membershipRows.length === 0) {
      setLoading(false);
      return;
    }

    const validMembership = membershipRows.find(
      (membership) => membership.team_id === activeTeamId,
    );

    if (!validMembership) {
      activeTeamId = membershipRows[0].team_id;
      localStorage.setItem("fullout_active_team", activeTeamId);
    }

    if (!activeTeamId) {
      setError("No active team selected.");
      setLoading(false);
      return;
    }

    const selectedTeamId = activeTeamId;

    const selectedMembership = membershipRows.find(
      (membership) => membership.team_id === selectedTeamId,
    );

    setRole(selectedMembership?.role || "");

    const { data: teamData, error: teamError } = await supabase
      .from("teams")
      .select("id, name")
      .eq("id", selectedTeamId)
      .maybeSingle();

    if (teamError) {
      setError(teamError.message);
      setLoading(false);
      return;
    }

    if (!teamData) {
      setError("Team not found.");
      setLoading(false);
      return;
    }

    setTeam(teamData as Team);

    const { data: setRows, error: setsError } = await supabase
      .from("sets")
      .select(
        "id, team_id, name, description, season, season_year, created_by, created_at",
      )
      .eq("team_id", selectedTeamId)
      .order("created_at", { ascending: false });

    if (setsError) {
      setError(setsError.message);
      setLoading(false);
      return;
    }

    setSets((setRows || []) as SetRow[]);
    setLoading(false);
  }

  const canCreateSet =
    role === "director" || role === "captain" || role === "choreographer";

  async function createSet(event: React.FormEvent) {
    event.preventDefault();

    if (!team || !canCreateSet) {
      return;
    }

    setCreating(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { error: insertError } = await supabase.from("sets").insert({
      team_id: team.id,
      name: name.trim(),
      description: description.trim() || null,
      season,
      season_year: Number(seasonYear),
      created_by: user.id,
    });

    if (insertError) {
      setError(insertError.message);
      setCreating(false);
      return;
    }

    setName("");
    setDescription("");
    setSeason("Fall");
    setSeasonYear(new Date().getFullYear().toString());
    setShowModal(false);
    setCreating(false);

    await loadSets();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="animate-pulse space-y-5">
            <div className="h-8 w-32 rounded bg-gray-200" />
            <div className="h-6 w-48 rounded bg-gray-200" />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="h-48 rounded-2xl bg-gray-200" />
              <div className="h-48 rounded-2xl bg-gray-200" />
              <div className="h-48 rounded-2xl bg-gray-200" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">{team?.name}</p>

            <h1 className="mt-1 text-3xl font-bold text-gray-900">Sets</h1>
          </div>

          {canCreateSet && (
            <button
              onClick={() => setShowModal(true)}
              className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Create set
            </button>
          )}
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {sets.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <h2 className="text-lg font-semibold text-gray-900">No sets yet</h2>

            <p className="mt-2 text-sm text-gray-500">
              {canCreateSet
                ? "Create your first set to start organizing choreography."
                : "Sets created by your team will appear here."}
            </p>

            {canCreateSet && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-5 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                Create your first set
              </button>
            )}
          </div>
        ) : (
          <section className="mt-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Team Sets
            </h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sets.map((set) => (
                <Link
                  key={set.id}
                  href={`/sets/${set.id}`}
                  className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-gray-400 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {set.name}
                    </h3>

                    {set.season && set.season_year && (
                      <span className="whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                        {set.season} {set.season_year}
                      </span>
                    )}
                  </div>

                  {set.description && (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                      {set.description}
                    </p>
                  )}

                  <p className="mt-6 text-sm font-medium text-gray-900">
                    Open set →
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Create set
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={createSet} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Set name
                </label>

                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Fall 2026 Set"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Season
                  </label>

                  <select
                    value={season}
                    onChange={(event) => setSeason(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    {seasons.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Year
                  </label>

                  <input
                    required
                    type="number"
                    value={seasonYear}
                    onChange={(event) => setSeasonYear(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="w-full rounded-lg bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create set"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
