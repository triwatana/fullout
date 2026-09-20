"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppNav from "@/app/components/AppNav";

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

type Member = {
  id: string;
  user_id: string;
  role: string;
  member_since: string | null;
  member_since_year: number | null;
  name: string;
  email: string;
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

const videoTypes = [
  { value: "full_run", label: "Full Run" },
  { value: "rehearsal", label: "Rehearsal" },
  { value: "breakdown", label: "Breakdown" },
  { value: "formation", label: "Formation" },
  { value: "cleaning", label: "Cleaning" },
  { value: "other", label: "Other" },
];

function formatTimestamp(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function parseTimestamp(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return 0;

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");

    if (parts.length === 2) {
      const minutes = Number(parts[0]);
      const seconds = Number(parts[1]);

      if (
        Number.isFinite(minutes) &&
        Number.isFinite(seconds) &&
        minutes >= 0 &&
        seconds >= 0 &&
        seconds < 60
      ) {
        return minutes * 60 + seconds;
      }
    }

    return null;
  }

  const seconds = Number(trimmed);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds;
  }

  return null;
}

function getVideoTypeLabel(type: string) {
  return videoTypes.find((item) => item.value === type)?.label ?? "Other";
}

export default function SetPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const setId = params.setId as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [setData, setSetData] = useState<SetRow | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [role, setRole] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setQueryError] = useState("");

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [addingVideo, setAddingVideo] = useState(false);

  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoType, setVideoType] = useState("rehearsal");
  const [partNumber, setPartNumber] = useState("");

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const [correctionTimestamp, setCorrectionTimestamp] = useState("");
  const [correctionDancer, setCorrectionDancer] = useState("");
  const [correctionComment, setCorrectionComment] = useState("");
  const [addingCorrection, setAddingCorrection] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const isLeader =
    role === "director" || role === "captain" || role === "choreographer";

  async function loadSet() {
    setLoading(true);
    setQueryError("");

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

      const { data: currentMembership, error: membershipError } = await supabase
        .from("team_members")
        .select("id,user_id,role,member_since,member_since_year")
        .eq("team_id", activeTeamId)
        .eq("user_id", user.id)
        .single();

      if (membershipError || !currentMembership) {
        router.push("/dashboard");
        return;
      }

      setRole(currentMembership.role);

      const { data: currentSet, error: setError } = await supabase
        .from("sets")
        .select("id,team_id,name,description,season,season_year,created_by")
        .eq("id", setId)
        .eq("team_id", activeTeamId)
        .single();

      if (setError || !currentSet) {
        setQueryError("Set not found.");
        return;
      }

      setSetData(currentSet);

      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("id,name")
        .eq("id", activeTeamId)
        .single();

      if (teamError) {
        setQueryError(teamError.message);
        return;
      }

      setTeam(teamData);

      const { data: videoData, error: videosError } = await supabase
        .from("videos")
        .select(
          "id,set_id,uploaded_by,title,video_url,video_type,part_number,created_at",
        )
        .eq("set_id", setId)
        .order("created_at", { ascending: false });

      if (videosError) {
        setQueryError(videosError.message);
        return;
      }

      const loadedVideos = videoData ?? [];
      setVideos(loadedVideos);

      const { data: teamMembers, error: membersError } = await supabase
        .from("team_members")
        .select("id,user_id,role,member_since,member_since_year")
        .eq("team_id", activeTeamId)
        .order("created_at", { ascending: true });

      if (membersError) {
        setQueryError(membersError.message);
        return;
      }

      const memberRows = teamMembers ?? [];

      const userIds = memberRows.map((member) => member.user_id);

      let profiles: {
        id: string;
        name: string | null;
        email: string | null;
      }[] = [];

      if (userIds.length > 0) {
        const { data: profileData, error: profilesError } = await supabase
          .from("profiles")
          .select("id,name,email")
          .in("id", userIds);

        if (profilesError) {
          setQueryError(profilesError.message);
          return;
        }

        profiles = profileData ?? [];
      }

      const flattenedMembers: Member[] = memberRows.map((member) => {
        const profile = profiles.find((item) => item.id === member.user_id);

        return {
          id: member.id,
          user_id: member.user_id,
          role: member.role,
          member_since: member.member_since,
          member_since_year: member.member_since_year,
          name: profile?.name || "Unnamed dancer",
          email: profile?.email || "",
        };
      });

      setMembers(flattenedMembers);

      if (loadedVideos.length > 0) {
        const videoIds = loadedVideos.map((video) => video.id);

        const { data: correctionData, error: correctionsError } = await supabase
          .from("corrections")
          .select(
            "id,video_id,created_by,dancer_id,timestamp_seconds,comment,resolved,created_at",
          )
          .in("video_id", videoIds)
          .order("timestamp_seconds", { ascending: true });

        if (correctionsError) {
          setQueryError(correctionsError.message);
          return;
        }

        setCorrections(correctionData ?? []);
      } else {
        setCorrections([]);
      }
    } catch (err) {
      setQueryError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSet();
  }, [setId]);

  function resetVideoForm() {
    setVideoTitle("");
    setVideoUrl("");
    setVideoType("rehearsal");
    setPartNumber("");
  }

  async function addVideo(e: React.FormEvent) {
    e.preventDefault();

    if (!setData || !currentUserId) return;

    if (!videoTitle.trim()) {
      setQueryError("Please enter a video title.");
      return;
    }

    if (!videoUrl.trim()) {
      setQueryError("Please enter a video URL.");
      return;
    }

    setAddingVideo(true);
    setQueryError("");

    try {
      const parsedPartNumber = partNumber.trim() ? Number(partNumber) : null;

      if (
        parsedPartNumber !== null &&
        (!Number.isInteger(parsedPartNumber) || parsedPartNumber < 1)
      ) {
        setQueryError("Part number must be a positive whole number.");
        setAddingVideo(false);
        return;
      }

      const { error: insertError } = await supabase.from("videos").insert({
        set_id: setData.id,
        uploaded_by: currentUserId,
        title: videoTitle.trim(),
        video_url: videoUrl.trim(),
        video_type: videoType,
        part_number: parsedPartNumber,
      });

      if (insertError) {
        setQueryError(insertError.message);
        return;
      }

      resetVideoForm();
      setShowVideoModal(false);
      await loadSet();
    } finally {
      setAddingVideo(false);
    }
  }

  function openCorrectionModal(video: Video) {
    setSelectedVideo(video);
    setCorrectionTimestamp("");
    setCorrectionDancer("");
    setCorrectionComment("");
    setShowCorrectionModal(true);
  }

  async function addCorrection(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedVideo || !currentUserId) return;

    if (!correctionDancer) {
      setQueryError("Please select a dancer.");
      return;
    }

    if (!correctionComment.trim()) {
      setQueryError("Please enter a correction.");
      return;
    }

    const timestamp = parseTimestamp(correctionTimestamp);

    if (timestamp === null) {
      setQueryError("Enter a valid timestamp such as 0:12 or 1:24.");
      return;
    }

    setAddingCorrection(true);
    setQueryError("");

    try {
      const { error: insertError } = await supabase.from("corrections").insert({
        video_id: selectedVideo.id,
        created_by: currentUserId,
        dancer_id: correctionDancer,
        timestamp_seconds: timestamp,
        comment: correctionComment.trim(),
        resolved: false,
      });

      if (insertError) {
        setQueryError(insertError.message);
        return;
      }

      setShowCorrectionModal(false);
      setSelectedVideo(null);
      setCorrectionTimestamp("");
      setCorrectionDancer("");
      setCorrectionComment("");

      await loadSet();
    } finally {
      setAddingCorrection(false);
    }
  }

  async function toggleCorrection(correction: Correction) {
    if (!currentUserId) return;

    const canUpdate =
      correction.created_by === currentUserId ||
      correction.dancer_id === currentUserId ||
      isLeader;

    if (!canUpdate) return;

    const { error: updateError } = await supabase
      .from("corrections")
      .update({
        resolved: !correction.resolved,
      })
      .eq("id", correction.id);

    if (updateError) {
      setQueryError(updateError.message);
      return;
    }

    await loadSet();
  }

  function getMemberName(userId: string) {
    return (
      members.find((member) => member.user_id === userId)?.name ?? "Dancer"
    );
  }

  function getVideoCorrections(videoId: string) {
    return corrections.filter((correction) => correction.video_id === videoId);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-[#111111]">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-sm text-gray-500">Loading set...</p>
        </div>
      </main>
    );
  }

  if (!setData || !team) {
    return (
      <main className="min-h-screen bg-white text-[#111111]">
        <AppNav />
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Link href="/sets" className="text-sm text-gray-500 hover:text-[#1D4ED8]">
            ← Back to Sets
          </Link>

          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm text-red-700">{error || "Set not found."}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-[#111111]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Back navigation */}
        <Link
          href="/sets"
          className="text-sm text-gray-500 transition hover:text-[#1D4ED8]"
        >
          ← Back to Sets
        </Link>

        {/* Set header */}
        <div className="mt-6">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">{team.name}</p>

              <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                {setData.name}
              </h1>

              {(setData.season || setData.season_year) && (
                <p className="mt-2 text-sm text-gray-500">
                  {setData.season}
                  {setData.season_year ? ` ${setData.season_year}` : ""}
                </p>
              )}

              {setData.description && (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                  {setData.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Videos */}
        <section className="mt-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Videos</h2>
              <p className="mt-1 text-sm text-gray-500">
                Rehearsal videos and references for this set.
              </p>
            </div>

            {isLeader && (
              <button
                type="button"
                onClick={() => {
                  setQueryError("");
                  setShowVideoModal(true);
                }}
                className="shrink-0 rounded-full bg-[#2563EB] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1D4ED8]"
              >
                + Add video
              </button>
            )}
          </div>

          {videos.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-gray-300 p-10 text-center">
              <p className="text-sm text-gray-500">
                No videos have been added to this set yet.
              </p>

              {isLeader && (
                <p className="mt-2 text-xs text-gray-400">
                  Add a rehearsal, breakdown, formation, or full-run video
                  above.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {videos.map((video) => {
                const videoCorrections = getVideoCorrections(video.id);

                return (
                  <div
                    key={video.id}
                    className="rounded-xl border border-gray-200 bg-white p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{video.title}</h3>

                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                            {getVideoTypeLabel(video.video_type)}
                          </span>

                          {video.part_number && (
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                              Part {video.part_number}
                            </span>
                          )}
                        </div>

                        <p className="mt-2 break-all text-sm text-gray-500">
                          {video.video_url}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <a
                          href={video.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition hover:border-[#2563EB] hover:bg-white"
                        >
                          Open video
                        </a>

                        {isLeader && (
                          <button
                            type="button"
                            onClick={() => openCorrectionModal(video)}
                            className="rounded-full bg-[#2563EB] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1D4ED8]"
                          >
                            + Correction
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Corrections */}
                    {videoCorrections.length > 0 && (
                      <div className="mt-5 border-t border-gray-100 pt-5">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-sm font-semibold">Corrections</h4>

                          <span className="text-xs text-gray-400">
                            {videoCorrections.length}{" "}
                            {videoCorrections.length === 1
                              ? "correction"
                              : "corrections"}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {videoCorrections.map((correction) => {
                            const canResolve =
                              correction.dancer_id === currentUserId ||
                              isLeader ||
                              correction.created_by === currentUserId;

                            return (
                              <div
                                key={correction.id}
                                className={`rounded-lg border p-4 ${
                                  correction.resolved
                                    ? "border-gray-100 bg-white"
                                    : "border-gray-200 bg-white"
                                }`}
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs font-medium text-gray-700">
                                        {formatTimestamp(
                                          correction.timestamp_seconds,
                                        )}
                                      </span>

                                      <span className="text-xs text-gray-500">
                                        {getMemberName(correction.dancer_id)}
                                      </span>

                                      {correction.resolved && (
                                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500">
                                          Resolved
                                        </span>
                                      )}
                                    </div>

                                    <p
                                      className={`mt-2 text-sm leading-6 ${
                                        correction.resolved
                                          ? "text-gray-400 line-through"
                                          : "text-gray-700"
                                      }`}
                                    >
                                      {correction.comment}
                                    </p>
                                  </div>

                                  {canResolve && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleCorrection(correction)
                                      }
                                      className="shrink-0 text-left text-xs font-medium text-gray-600 hover:text-[#1D4ED8] sm:text-right"
                                    >
                                      {correction.resolved
                                        ? "Reopen"
                                        : "Mark resolved"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {videoCorrections.length === 0 && isLeader && (
                      <div className="mt-5 border-t border-gray-100 pt-4">
                        <button
                          type="button"
                          onClick={() => openCorrectionModal(video)}
                          className="text-sm font-semibold text-gray-500 hover:text-[#1D4ED8]"
                        >
                          + Add first correction
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Add Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Add video</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Add a video reference to {setData.name}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="text-xl leading-none text-gray-400 hover:text-[#1D4ED8]"
              >
                ×
              </button>
            </div>

            <form onSubmit={addVideo} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Video title
                </label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="e.g. Full Run - Week 3"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Video URL
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Paste a Google Drive, YouTube, Vimeo, or other shareable video
                  link.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Video type
                  </label>

                  <select
                    value={videoType}
                    onChange={(e) => setVideoType(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-[#111111] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  >
                    {videoTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Part number
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium transition hover:border-[#2563EB]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={addingVideo}
                  className="rounded-full bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addingVideo ? "Adding..." : "Add video"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Correction Modal */}
      {showCorrectionModal && selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Add correction</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedVideo.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCorrectionModal(false);
                  setSelectedVideo(null);
                }}
                className="text-xl leading-none text-gray-400 hover:text-[#1D4ED8]"
              >
                ×
              </button>
            </div>

            <form onSubmit={addCorrection} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Timestamp
                  </label>

                  <input
                    type="text"
                    value={correctionTimestamp}
                    onChange={(e) => setCorrectionTimestamp(e.target.value)}
                    placeholder="0:12"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-mono text-sm outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  />

                  <p className="mt-1.5 text-xs text-gray-400">
                    Example: 0:12 or 1:24
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Dancer
                  </label>

                  <select
                    value={correctionDancer}
                    onChange={(e) => setCorrectionDancer(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-[#111111] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select dancer</option>

                    {members
                      .filter((member) => member.role !== "alumni")
                      .map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Correction
                </label>

                <textarea
                  value={correctionComment}
                  onChange={(e) => setCorrectionComment(e.target.value)}
                  placeholder="e.g. Keep your chest more lifted through this transition."
                  rows={4}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCorrectionModal(false);
                    setSelectedVideo(null);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium transition hover:border-[#2563EB]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={addingCorrection}
                  className="rounded-full bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addingCorrection ? "Adding..." : "Add correction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
