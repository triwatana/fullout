"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppNav from "@/app/components/AppNav";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Team = {
  id: string;
  name: string;
};

type TeamMembership = {
  team_id: string;
  role: string;
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
  video_url: string;
};

type Correction = {
  id: string;
  video_id: string;
  created_by: string;
  dancer_id: string;
  timestamp_seconds: number;
  comment: string;
  resolved: boolean;
  created_at: string;
};

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
};

function formatTimestamp(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function CorrectionsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [team, setTeam] = useState<Team | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");

  /*
   * Director, Captain, and Choreographer can manage all corrections.
   */
  const isLeader =
    role === "director" || role === "captain" || role === "choreographer";

  async function loadCorrections() {
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

      setCurrentUserId(user.id);

      const activeTeamId = localStorage.getItem("fullout_active_team");

      if (!activeTeamId) {
        router.push("/dashboard");
        return;
      }

      /*
       * Get the user's membership for the active team.
       */
      const { data: membership, error: membershipError } = await supabase
        .from("team_members")
        .select("team_id,role")
        .eq("team_id", activeTeamId)
        .eq("user_id", user.id)
        .single();

      if (membershipError || !membership) {
        localStorage.removeItem("fullout_active_team");
        router.push("/dashboard");
        return;
      }

      setRole(membership.role);

      /*
       * Load team.
       */
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("id,name")
        .eq("id", activeTeamId)
        .single();

      if (teamError || !teamData) {
        setError(teamError?.message || "Team not found.");
        return;
      }

      setTeam(teamData);

      /*
       * Load sets for the active team.
       */
      const { data: setData, error: setsError } = await supabase
        .from("sets")
        .select("id,team_id,name")
        .eq("team_id", activeTeamId)
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
        setProfiles([]);
        return;
      }

      const setIds = loadedSets.map((set) => set.id);

      /*
       * Load videos belonging to those sets.
       */
      const { data: videoData, error: videosError } = await supabase
        .from("videos")
        .select("id,set_id,title,video_url")
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
        setProfiles([]);
        return;
      }

      const videoIds = loadedVideos.map((video) => video.id);

      /*
       * Load all corrections for those videos.
       */
      const { data: correctionData, error: correctionsError } = await supabase
        .from("corrections")
        .select(
          "id,video_id,created_by,dancer_id,timestamp_seconds,comment,resolved,created_at",
        )
        .in("video_id", videoIds)
        .order("resolved", { ascending: true })
        .order("created_at", { ascending: false });

      if (correctionsError) {
        setError(correctionsError.message);
        return;
      }

      let loadedCorrections = correctionData ?? [];

      /*
       * IMPORTANT:
       * Use membership.role here rather than React state `role`.
       *
       * React state updates are asynchronous, so `role` may still be null
       * during this function's first execution.
       */
      const membershipIsLeader =
        membership.role === "director" ||
        membership.role === "captain" ||
        membership.role === "choreographer";

      /*
       * Dancers only see corrections assigned to themselves.
       * Leaders see all corrections for the active team.
       * Alumni can view the team's corrections.
       */
      if (!membershipIsLeader && membership.role !== "alumni") {
        loadedCorrections = loadedCorrections.filter(
          (correction) => correction.dancer_id === user.id,
        );
      }

      setCorrections(loadedCorrections);

      /*
       * Load profile names for dancers and creators.
       */
      const profileIds = Array.from(
        new Set(
          loadedCorrections.flatMap((correction) => [
            correction.dancer_id,
            correction.created_by,
          ]),
        ),
      );

      if (profileIds.length > 0) {
        const { data: profileData, error: profilesError } = await supabase
          .from("profiles")
          .select("id,name,email")
          .in("id", profileIds);

        if (profilesError) {
          setError(profilesError.message);
          return;
        }

        setProfiles(profileData ?? []);
      } else {
        setProfiles([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCorrections();
  }, []);

  function getProfileName(userId: string) {
    const profile = profiles.find((item) => item.id === userId);

    return profile?.name || "Unknown dancer";
  }

  function getVideo(videoId: string) {
    return videos.find((video) => video.id === videoId);
  }

  function getSet(setId: string) {
    return sets.find((set) => set.id === setId);
  }

  function getSetForVideo(videoId: string) {
    const video = getVideo(videoId);

    if (!video) return null;

    return getSet(video.set_id);
  }

  const visibleCorrections = corrections.filter((correction) => {
    if (filter === "open") {
      return !correction.resolved;
    }

    if (filter === "resolved") {
      return correction.resolved;
    }

    return true;
  });

  const openCount = corrections.filter(
    (correction) => !correction.resolved,
  ).length;

  const resolvedCount = corrections.filter(
    (correction) => correction.resolved,
  ).length;

  async function toggleCorrection(correction: Correction) {
    if (!currentUserId) return;

    const canUpdate =
      correction.dancer_id === currentUserId ||
      correction.created_by === currentUserId ||
      isLeader;

    if (!canUpdate) return;

    const { error: updateError } = await supabase
      .from("corrections")
      .update({
        resolved: !correction.resolved,
      })
      .eq("id", correction.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setCorrections((current) =>
      current.map((item) =>
        item.id === correction.id
          ? {
              ...item,
              resolved: !item.resolved,
            }
          : item,
      ),
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-black">
        <AppNav />
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-sm text-gray-500">Loading corrections...</p>
        </div>
      </main>
    );
  }

  if (!team) {
    return (
      <main className="min-h-screen bg-white text-black">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-sm text-gray-500">{error || "Team not found."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <AppNav />
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mt-6 text-sm font-medium text-gray-500">
              {team.name}
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Corrections
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              {isLeader
                ? "Review and manage feedback across your team's sets."
                : "Keep track of the feedback assigned to you."}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setFilter("open")}
            className={`rounded-xl border p-5 text-left transition ${
              filter === "open"
                ? "border-black"
                : "border-gray-200 hover:border-gray-400"
            }`}
          >
            <p className="text-sm text-gray-500">Open</p>
            <p className="mt-1 text-2xl font-semibold">{openCount}</p>
          </button>

          <button
            type="button"
            onClick={() => setFilter("resolved")}
            className={`rounded-xl border p-5 text-left transition ${
              filter === "resolved"
                ? "border-black"
                : "border-gray-200 hover:border-gray-400"
            }`}
          >
            <p className="text-sm text-gray-500">Resolved</p>
            <p className="mt-1 text-2xl font-semibold">{resolvedCount}</p>
          </button>

          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-xl border p-5 text-left transition ${
              filter === "all"
                ? "border-black"
                : "border-gray-200 hover:border-gray-400"
            }`}
          >
            <p className="text-sm text-gray-500">Total</p>
            <p className="mt-1 text-2xl font-semibold">{corrections.length}</p>
          </button>
        </div>

        {/* Filter tabs */}
        <div className="mt-8 flex gap-1 border-b border-gray-200">
          {[
            { value: "open", label: "Open" },
            { value: "resolved", label: "Resolved" },
            { value: "all", label: "All" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                setFilter(item.value as "open" | "resolved" | "all")
              }
              className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                filter === item.value
                  ? "border-black text-black"
                  : "border-transparent text-gray-500 hover:text-black"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Corrections list */}
        {visibleCorrections.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <div className="mx-auto max-w-md">
              <h2 className="text-lg font-semibold">
                {filter === "open"
                  ? "No open corrections"
                  : filter === "resolved"
                    ? "No resolved corrections"
                    : "No corrections yet"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                {filter === "open"
                  ? isLeader
                    ? "Your team does not have any unresolved corrections right now."
                    : "You're all caught up. New feedback assigned to you will appear here."
                  : "Corrections will appear here once your team starts reviewing videos."}
              </p>

              {isLeader && filter !== "resolved" && (
                <Link
                  href="/sets"
                  className="mt-5 inline-flex rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  Go to Sets
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {visibleCorrections.map((correction) => {
              const video = getVideo(correction.video_id);
              const set = getSetForVideo(correction.video_id);

              if (!video || !set) return null;

              const canResolve =
                correction.dancer_id === currentUserId ||
                correction.created_by === currentUserId ||
                isLeader;

              return (
                <div
                  key={correction.id}
                  className={`rounded-xl border p-5 transition ${
                    correction.resolved
                      ? "border-gray-200 bg-gray-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      {/* Set + video */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/sets/${set.id}`}
                          className="text-sm font-semibold hover:underline"
                        >
                          {set.name}
                        </Link>

                        <span className="text-gray-300">/</span>

                        <span className="text-sm text-gray-500">
                          {video.title}
                        </span>
                      </div>

                      {/* Timestamp */}
                      <div className="mt-4 flex items-center gap-3">
                        <span className="rounded-md bg-gray-100 px-2.5 py-1.5 font-mono text-sm font-medium text-gray-700">
                          {formatTimestamp(correction.timestamp_seconds)}
                        </span>

                        {correction.resolved ? (
                          <span className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500">
                            Resolved
                          </span>
                        ) : (
                          <span className="rounded-full bg-black px-2.5 py-1 text-xs font-medium text-white">
                            Open
                          </span>
                        )}
                      </div>

                      {/* Correction */}
                      <p
                        className={`mt-4 max-w-3xl text-sm leading-6 ${
                          correction.resolved
                            ? "text-gray-400"
                            : "text-gray-700"
                        }`}
                      >
                        {correction.comment}
                      </p>

                      {/* People */}
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
                        <span>
                          <span className="text-gray-400">Assigned to:</span>{" "}
                          {getProfileName(correction.dancer_id)}
                        </span>

                        <span>
                          <span className="text-gray-400">Added by:</span>{" "}
                          {getProfileName(correction.created_by)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <a
                        href={video.video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition hover:border-black hover:bg-gray-50"
                      >
                        Open video
                      </a>

                      <Link
                        href={`/sets/${set.id}`}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition hover:border-black hover:bg-gray-50"
                      >
                        Open set
                      </Link>

                      {canResolve && (
                        <button
                          type="button"
                          onClick={() => toggleCorrection(correction)}
                          className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                        >
                          {correction.resolved ? "Reopen" : "Mark resolved"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
