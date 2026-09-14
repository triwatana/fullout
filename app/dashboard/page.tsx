"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TeamMembership = {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
};

type Team = {
  id: string;
  name: string;
};

type SetRow = {
  id: string;
  team_id: string;
  name: string;
};

type Video = {
  id: string;
  set_id: string;
  title: string;
};

type Correction = {
  id: string;
  video_id: string;
  dancer_id: string;
  timestamp_seconds: number;
  comment: string;
  resolved: boolean;
  created_at: string;
};

function formatTimestamp(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);

  const [memberships, setMemberships] = useState<TeamMembership[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [activeMembership, setActiveMembership] =
    useState<TeamMembership | null>(null);

  const [sets, setSets] = useState<SetRow[]>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      /*
       * Load all memberships for this user.
       */
      const { data: membershipData, error: membershipError } = await supabase
        .from("team_members")
        .select("id,team_id,user_id,role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (membershipError) {
        setError(membershipError.message);
        return;
      }

      const loadedMemberships = membershipData ?? [];
      setMemberships(loadedMemberships);

      if (loadedMemberships.length === 0) {
        setActiveTeam(null);
        setActiveMembership(null);
        setSets([]);
        setVideos([]);
        setCorrections([]);
        return;
      }

      const teamIds = loadedMemberships.map((membership) => membership.team_id);

      /*
       * Load all teams.
       */
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("id,name")
        .in("id", teamIds);

      if (teamError) {
        setError(teamError.message);
        return;
      }

      const loadedTeams = teamData ?? [];
      setTeams(loadedTeams);

      /*
       * Restore the previously selected team.
       * If it is no longer valid, use the first team.
       */
      const savedTeamId = localStorage.getItem("fullout_active_team");

      const validSavedTeam = loadedTeams.find(
        (team) => team.id === savedTeamId,
      );

      const selectedTeam = validSavedTeam ?? loadedTeams[0] ?? null;

      if (!selectedTeam) {
        setActiveTeam(null);
        setActiveMembership(null);
        return;
      }

      localStorage.setItem("fullout_active_team", selectedTeam.id);

      setActiveTeam(selectedTeam);

      const selectedMembership =
        loadedMemberships.find(
          (membership) => membership.team_id === selectedTeam.id,
        ) ?? null;

      setActiveMembership(selectedMembership);

      /*
       * Load sets for the active team.
       */
      const { data: setData, error: setsError } = await supabase
        .from("sets")
        .select("id,team_id,name")
        .eq("team_id", selectedTeam.id)
        .order("created_at", { ascending: false });

      if (setsError) {
        setError(setsError.message);
        return;
      }

      const loadedSets = setData ?? [];
      setSets(loadedSets);

      if (loadedSets.length === 0) {
        setVideos([]);
        setCorrections([]);
        return;
      }

      const setIds = loadedSets.map((set) => set.id);

      /*
       * Load videos for the active team's sets.
       */
      const { data: videoData, error: videosError } = await supabase
        .from("videos")
        .select("id,set_id,title")
        .in("set_id", setIds)
        .order("created_at", { ascending: false });

      if (videosError) {
        setError(videosError.message);
        return;
      }

      const loadedVideos = videoData ?? [];
      setVideos(loadedVideos);

      if (loadedVideos.length === 0) {
        setCorrections([]);
        return;
      }

      const videoIds = loadedVideos.map((video) => video.id);

      /*
       * Load corrections for the active team's videos.
       */
      const { data: correctionData, error: correctionsError } = await supabase
        .from("corrections")
        .select(
          "id,video_id,dancer_id,timestamp_seconds,comment,resolved,created_at",
        )
        .in("video_id", videoIds)
        .order("created_at", { ascending: false });

      if (correctionsError) {
        setError(correctionsError.message);
        return;
      }

      let loadedCorrections = correctionData ?? [];

      /*
       * Dancers only see their own corrections.
       * Leaders see all team corrections.
       * Alumni can view team corrections.
       */
      const role = selectedMembership?.role;

      const isLeader =
        role === "director" || role === "captain" || role === "choreographer";

      if (!isLeader && role !== "alumni") {
        loadedCorrections = loadedCorrections.filter(
          (correction) => correction.dancer_id === user.id,
        );
      }

      setCorrections(loadedCorrections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function switchTeam(teamId: string) {
    localStorage.setItem("fullout_active_team", teamId);

    const selectedTeam = teams.find((team) => team.id === teamId) ?? null;

    const selectedMembership =
      memberships.find((membership) => membership.team_id === teamId) ?? null;

    setActiveTeam(selectedTeam);
    setActiveMembership(selectedMembership);

    loadDashboard();
  }

  function getSet(setId: string) {
    return sets.find((set) => set.id === setId);
  }

  function getVideo(videoId: string) {
    return videos.find((video) => video.id === videoId);
  }

  /*
   * Only unresolved corrections belong on the dashboard.
   */
  const openCorrections = corrections.filter(
    (correction) => !correction.resolved,
  );

  /*
   * Show the three most recent open corrections.
   */
  const recentOpenCorrections = [...openCorrections]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 3);

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-black">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  if (!activeTeam) {
    return (
      <main className="min-h-screen bg-white text-black">
        <div className="mx-auto max-w-2xl px-6 py-16">
          <h1 className="text-2xl font-semibold">Welcome to FullOut</h1>

          <p className="mt-2 text-sm text-gray-500">
            Create or join a dance team to get started.
          </p>

          <Link
            href="/onboarding"
            className="mt-6 inline-flex rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            Get started
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-gray-500">FullOut</p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Dashboard
            </h1>
          </div>

          {teams.length > 1 && (
            <div>
              <label className="sr-only">Active team</label>

              <select
                value={activeTeam.id}
                onChange={(e) => switchTeam(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </header>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Team */}
        <section className="mt-8">
          <p className="text-sm text-gray-500">Active team</p>

          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold">{activeTeam.name}</h2>

            {activeMembership?.role && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-600">
                {activeMembership.role}
              </span>
            )}
          </div>
        </section>

        {/* Stats */}
        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/members"
            className="rounded-xl border border-gray-200 p-5 transition hover:border-gray-400"
          >
            <p className="text-sm text-gray-500">Team</p>

            <p className="mt-1 text-2xl font-semibold">Members</p>

            <p className="mt-2 text-sm text-gray-500">View your team</p>
          </Link>

          <Link
            href="/sets"
            className="rounded-xl border border-gray-200 p-5 transition hover:border-gray-400"
          >
            <p className="text-sm text-gray-500">Sets</p>

            <p className="mt-1 text-2xl font-semibold">{sets.length}</p>

            <p className="mt-2 text-sm text-gray-500">View choreography</p>
          </Link>

          <Link
            href="/corrections"
            className={`rounded-xl border p-5 transition ${
              openCorrections.length > 0
                ? "border-black"
                : "border-gray-200 hover:border-gray-400"
            }`}
          >
            <p className="text-sm text-gray-500">Corrections</p>

            <p className="mt-1 text-2xl font-semibold">
              {openCorrections.length}
            </p>

            <p className="mt-2 text-sm text-gray-500">
              {openCorrections.length === 0
                ? "You're all caught up"
                : openCorrections.length === 1
                  ? "1 open correction"
                  : "Open corrections"}
            </p>
          </Link>
        </section>

        {/* Corrections */}
        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Corrections</h2>

              <p className="mt-1 text-sm text-gray-500">
                {openCorrections.length > 0
                  ? `${openCorrections.length} open ${
                      openCorrections.length === 1
                        ? "correction"
                        : "corrections"
                    }`
                  : "You're all caught up."}
              </p>
            </div>

            <Link
              href="/corrections"
              className="shrink-0 text-sm font-medium text-gray-600 transition hover:text-black"
            >
              View all →
            </Link>
          </div>

          {recentOpenCorrections.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm font-medium text-gray-700">
                No open corrections
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {activeMembership?.role === "dancer"
                  ? "You're all caught up."
                  : "Your team has no unresolved feedback right now."}
              </p>

              <Link
                href="/sets"
                className="mt-4 inline-block text-sm font-medium hover:underline"
              >
                View sets →
              </Link>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {recentOpenCorrections.map((correction) => {
                const video = getVideo(correction.video_id);

                if (!video) return null;

                const set = getSet(video.set_id);

                if (!set) return null;

                return (
                  <Link
                    key={correction.id}
                    href={`/sets/${set.id}`}
                    className="block rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-400 hover:bg-gray-50"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{set.name}</p>

                          <span className="text-gray-300">/</span>

                          <p className="truncate text-sm text-gray-500">
                            {video.title}
                          </p>
                        </div>

                        <div className="mt-3 flex items-start gap-3">
                          <span className="shrink-0 rounded-md bg-gray-100 px-2 py-1 font-mono text-xs font-medium text-gray-700">
                            {formatTimestamp(correction.timestamp_seconds)}
                          </span>

                          <p className="text-sm leading-6 text-gray-700">
                            {correction.comment}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-black px-2.5 py-1 text-xs font-medium text-white">
                          Open
                        </span>

                        <span className="text-gray-400">→</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {openCorrections.length > 3 && (
            <div className="mt-4 text-center">
              <Link
                href="/corrections"
                className="text-sm font-medium hover:underline"
              >
                View all {openCorrections.length} corrections →
              </Link>
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Quick actions</h2>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/sets"
              className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              View sets
            </Link>

            <Link
              href="/members"
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium transition hover:border-black"
            >
              View members
            </Link>

            <Link
              href="/corrections"
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium transition hover:border-black"
            >
              View corrections
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
