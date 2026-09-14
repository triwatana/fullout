"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Team = {
  id: string;
  name: string;
};

type Membership = {
  team_id: string;
  role: string;
};

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [userName, setUserName] = useState("there");
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [role, setRole] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [setCount, setSetCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.name) {
      setUserName(profile.name);
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("team_members")
      .select("team_id, role")
      .eq("user_id", user.id);

    if (membershipError) {
      setError(membershipError.message);
      setLoading(false);
      return;
    }

    if (!memberships || memberships.length === 0) {
      setLoading(false);
      return;
    }

    const membershipRows = memberships as Membership[];

    const teamIds = membershipRows.map((membership) => membership.team_id);

    const { data: teamRows, error: teamError } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", teamIds);

    if (teamError) {
      setError(teamError.message);
      setLoading(false);
      return;
    }

    const loadedTeams = (teamRows || []) as Team[];

    setTeams(loadedTeams);

    const savedTeamId =
      typeof window !== "undefined"
        ? localStorage.getItem("fullout_active_team")
        : null;

    const validSavedTeam = loadedTeams.find((team) => team.id === savedTeamId);

    const selectedTeam = validSavedTeam || loadedTeams[0];

    if (!selectedTeam) {
      setLoading(false);
      return;
    }

    const selectedTeamId = selectedTeam.id;

    setActiveTeamId(selectedTeamId);
    setActiveTeam(selectedTeam);

    localStorage.setItem("fullout_active_team", selectedTeamId);

    const selectedMembership = membershipRows.find(
      (membership) => membership.team_id === selectedTeamId,
    );

    setRole(selectedMembership?.role || "");

    const { count: members } = await supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("team_id", selectedTeamId);

    setMemberCount(members || 0);

    const { count: sets } = await supabase
      .from("sets")
      .select("*", { count: "exact", head: true })
      .eq("team_id", selectedTeamId);

    setSetCount(sets || 0);

    setLoading(false);
  }

  function switchTeam(teamId: string) {
    localStorage.setItem("fullout_active_team", teamId);
    setActiveTeamId(teamId);

    const selectedTeam = teams.find((team) => team.id === teamId);

    if (selectedTeam) {
      setActiveTeam(selectedTeam);
    }

    loadDashboard();
  }

  async function handleLogout() {
    localStorage.removeItem("fullout_active_team");
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded bg-gray-200" />
            <div className="h-32 rounded-2xl bg-gray-100" />
            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-32 rounded-2xl bg-gray-100" />
              <div className="h-32 rounded-2xl bg-gray-100" />
              <div className="h-32 rounded-2xl bg-gray-100" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (teams.length === 0) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">FullOut</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">
                Welcome to FullOut
              </h1>
            </div>

            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Log out
            </button>
          </div>

          <div className="mt-10 rounded-2xl border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900">Get started</h2>

            <p className="mt-2 text-gray-600">
              Create a team or join an existing dance team to start using
              FullOut.
            </p>

            <Link
              href="/onboarding"
              className="mt-6 inline-block rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              Set up your team
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-xl font-bold text-gray-900">
            FullOut
          </Link>

          <div className="flex items-center gap-5 text-sm">
            <Link href="/members" className="text-gray-600 hover:text-gray-900">
              Members
            </Link>

            <Link href="/sets" className="text-gray-600 hover:text-gray-900">
              Sets
            </Link>

            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-900"
            >
              Log out
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm text-gray-500">Welcome back</p>

            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              {userName}
            </h1>

            {activeTeam && (
              <p className="mt-2 text-gray-600">
                {activeTeam.name}
                {role && (
                  <span className="ml-2 text-sm text-gray-400">
                    · {role.charAt(0).toUpperCase() + role.slice(1)}
                  </span>
                )}
              </p>
            )}
          </div>

          {teams.length > 1 && (
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Active team
              </label>

              <select
                value={activeTeamId || ""}
                onChange={(event) => switchTeam(event.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Link
            href="/members"
            className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-gray-400"
          >
            <p className="text-sm text-gray-500">Team</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {memberCount}
            </p>
            <p className="mt-1 text-sm text-gray-600">Members</p>
          </Link>

          <Link
            href="/sets"
            className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-gray-400"
          >
            <p className="text-sm text-gray-500">Choreography</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{setCount}</p>
            <p className="mt-1 text-sm text-gray-600">Sets</p>
          </Link>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-500">Feedback</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">—</p>
            <p className="mt-1 text-sm text-gray-600">
              Corrections coming next
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
