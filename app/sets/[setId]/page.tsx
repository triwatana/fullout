"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Team = {
  id: string;
  name: string;
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

type Video = {
  id: string;
  set_id: string;
  uploaded_by: string;
  title: string;
  video_url: string;
  video_type: string;
  part_number: number | null;
  created_at: string;
};

const videoTypes = [
  { value: "full_run", label: "Full Run" },
  { value: "rehearsal", label: "Rehearsal" },
  { value: "breakdown", label: "Breakdown" },
  { value: "formation", label: "Formation Breakdown" },
  { value: "cleaning", label: "Cleaning" },
  { value: "other", label: "Other" },
];

export default function SetPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();

  const setId = typeof params.setId === "string" ? params.setId : null;

  const [team, setTeam] = useState<Team | null>(null);
  const [setData, setSetData] = useState<SetRow | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [role, setRole] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [addingVideo, setAddingVideo] = useState(false);

  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoType, setVideoType] = useState("full_run");
  const [partNumber, setPartNumber] = useState("");

  useEffect(() => {
    if (!setId) {
      setError("Set not found.");
      setLoading(false);
      return;
    }

    loadSet();
  }, [setId]);

  async function loadSet() {
    if (!setId) {
      return;
    }

    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const activeTeamId = localStorage.getItem("fullout_active_team");

    if (!activeTeamId) {
      setError("No active team selected.");
      setLoading(false);
      return;
    }

    /*
     * First verify that the Set belongs to the currently
     * selected active team.
     */
    const { data: selectedSet, error: setQueryError } = await supabase
      .from("sets")
      .select(
        "id, team_id, name, description, season, season_year, created_by, created_at",
      )
      .eq("id", setId)
      .eq("team_id", activeTeamId)
      .maybeSingle();

    if (setQueryError) {
      setError(setQueryError.message);
      setLoading(false);
      return;
    }

    if (!selectedSet) {
      setError("This set does not belong to your active team.");
      setLoading(false);
      return;
    }

    const loadedSet = selectedSet as SetRow;
    setSetData(loadedSet);

    /*
     * Load team.
     */
    const { data: teamData, error: teamError } = await supabase
      .from("teams")
      .select("id, name")
      .eq("id", activeTeamId)
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

    /*
     * Load current user's role on the active team.
     */
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", activeTeamId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      setError(membershipError.message);
      setLoading(false);
      return;
    }

    setRole(membership?.role || "");

    /*
     * Load videos belonging to this Set.
     */
    const { data: videoRows, error: videosError } = await supabase
      .from("videos")
      .select(
        "id, set_id, uploaded_by, title, video_url, video_type, part_number, created_at",
      )
      .eq("set_id", setId)
      .order("created_at", { ascending: true });

    if (videosError) {
      setError(videosError.message);
      setLoading(false);
      return;
    }

    setVideos((videoRows || []) as Video[]);
    setLoading(false);
  }

  const canAddVideo =
    role === "director" || role === "captain" || role === "choreographer";

  async function addVideo(event: React.FormEvent) {
    event.preventDefault();

    if (!setData || !canAddVideo) {
      return;
    }

    setAddingVideo(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const title = videoTitle.trim();
    const url = videoUrl.trim();

    if (!title) {
      setError("Please enter a video title.");
      setAddingVideo(false);
      return;
    }

    if (!url) {
      setError("Please enter a video URL.");
      setAddingVideo(false);
      return;
    }

    let parsedPartNumber: number | null = null;

    if (partNumber.trim()) {
      const number = Number(partNumber);

      if (!Number.isInteger(number) || number < 1) {
        setError("Part number must be a positive whole number.");
        setAddingVideo(false);
        return;
      }

      parsedPartNumber = number;
    }

    const { error: insertError } = await supabase.from("videos").insert({
      set_id: setData.id,
      uploaded_by: user.id,
      title,
      video_url: url,
      video_type: videoType,
      part_number: parsedPartNumber,
    });

    if (insertError) {
      setError(insertError.message);
      setAddingVideo(false);
      return;
    }

    setVideoTitle("");
    setVideoUrl("");
    setVideoType("full_run");
    setPartNumber("");

    setShowVideoModal(false);
    setAddingVideo(false);

    await loadSet();
  }

  function getVideoTypeLabel(type: string) {
    const match = videoTypes.find((videoType) => videoType.value === type);

    return match?.label || "Other";
  }

  function getVideosByType(type: string) {
    return videos
      .filter((video) => video.video_type === type)
      .sort((a, b) => {
        if (a.part_number !== null && b.part_number !== null) {
          return a.part_number - b.part_number;
        }

        if (a.part_number !== null) {
          return -1;
        }

        if (b.part_number !== null) {
          return 1;
        }

        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-5 w-24 rounded bg-gray-200" />
            <div className="h-10 w-72 rounded bg-gray-200" />
            <div className="h-5 w-48 rounded bg-gray-200" />

            <div className="mt-10 h-40 rounded-2xl bg-gray-200" />
            <div className="h-40 rounded-2xl bg-gray-200" />
          </div>
        </div>
      </main>
    );
  }

  if (!setData || !team) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <Link
            href="/sets"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Sets
          </Link>

          <div className="mt-8 rounded-2xl border border-red-200 bg-white p-8">
            <h1 className="text-xl font-semibold text-gray-900">
              Unable to load set
            </h1>

            <p className="mt-2 text-sm text-red-600">
              {error || "Set not found."}
            </p>
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
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-900"
            >
              Dashboard
            </Link>

            <Link href="/members" className="text-gray-600 hover:text-gray-900">
              Members
            </Link>

            <Link href="/sets" className="font-medium text-gray-900">
              Sets
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/sets"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Sets
        </Link>

        <div className="mt-6 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm text-gray-500">{team.name}</p>

            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              {setData.name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              {setData.season && setData.season_year && (
                <span>
                  {setData.season} {setData.season_year}
                </span>
              )}

              {setData.description && (
                <>
                  <span>·</span>
                  <span>{setData.description}</span>
                </>
              )}
            </div>
          </div>

          {canAddVideo && (
            <button
              onClick={() => setShowVideoModal(true)}
              className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Add video
            </button>
          )}
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Videos</h2>

              <p className="mt-1 text-sm text-gray-500">
                Rehearsal and choreography videos for this set.
              </p>
            </div>

            <span className="text-sm text-gray-500">
              {videos.length} {videos.length === 1 ? "video" : "videos"}
            </span>
          </div>

          {videos.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-10 text-center">
              <h3 className="text-lg font-semibold text-gray-900">
                No videos yet
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                {canAddVideo
                  ? "Add a rehearsal, full run, or breakdown video to get started."
                  : "Videos added by your team will appear here."}
              </p>

              {canAddVideo && (
                <button
                  onClick={() => setShowVideoModal(true)}
                  className="mt-5 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Add your first video
                </button>
              )}
            </div>
          ) : (
            <div className="mt-8 space-y-10">
              {videoTypes.map((type) => {
                const typeVideos = getVideosByType(type.value);

                if (typeVideos.length === 0) {
                  return null;
                }

                return (
                  <section key={type.value}>
                    <div className="mb-4 flex items-center gap-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                        {type.label}
                      </h3>

                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                        {typeVideos.length}
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {typeVideos.map((video) => (
                        <a
                          key={video.id}
                          href={video.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-gray-400 hover:shadow-sm"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-lg">
                              ▶
                            </div>

                            <div className="min-w-0">
                              <h4 className="font-semibold text-gray-900 group-hover:underline">
                                {video.title}
                              </h4>

                              <p className="mt-1 text-sm text-gray-500">
                                {getVideoTypeLabel(video.video_type)}

                                {video.part_number !== null &&
                                  ` · Part ${video.part_number}`}
                              </p>

                              <p className="mt-3 truncate text-xs text-gray-400">
                                {video.video_url}
                              </p>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Add video
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Add a link to a video for this set.
                </p>
              </div>

              <button
                onClick={() => setShowVideoModal(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={addVideo} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Video title
                </label>

                <input
                  required
                  value={videoTitle}
                  onChange={(event) => setVideoTitle(event.target.value)}
                  placeholder="e.g. Full Run #1"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Video URL
                </label>

                <input
                  required
                  type="url"
                  value={videoUrl}
                  onChange={(event) => setVideoUrl(event.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                />

                <p className="mt-1 text-xs text-gray-500">
                  YouTube, Google Drive, Vimeo, or another hosted video link.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Video type
                </label>

                <select
                  value={videoType}
                  onChange={(event) => setVideoType(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black"
                >
                  {videoTypes.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                      className="bg-white text-black"
                    >
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {videoType === "breakdown" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Part number
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={partNumber}
                    onChange={(event) => setPartNumber(event.target.value)}
                    placeholder="e.g. 1"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={addingVideo || !videoTitle.trim() || !videoUrl.trim()}
                className="w-full rounded-lg bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addingVideo ? "Adding..." : "Add video"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
