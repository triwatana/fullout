"use client";

import AppNav from "@/app/components/AppNav";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Team = {
  id: string;
  name: string;
  invite_code: string | null;
};

type Membership = {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  member_since: string | null;
  member_since_year: number | null;
};

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type Member = Membership & {
  profile: Profile | null;
};

const ROLE_OPTIONS = [
  "director",
  "captain",
  "choreographer",
  "dancer",
  "alumni",
];

const ROLE_LABELS: Record<string, string> = {
  director: "Director",
  captain: "Captain",
  choreographer: "Choreographer",
  dancer: "Dancer",
  alumni: "Alumni",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  director: "Team leadership",
  captain: "Team leadership",
  choreographer: "Choreography",
  dancer: "Performer",
  alumni: "Former member",
};

function formatRole(role: string) {
  return ROLE_LABELS[role] ?? role;
}

function formatMemberSince(season: string | null, year: number | null) {
  if (!season && !year) return "Member since —";
  if (season && year) return `Member since ${season} ${year}`;
  if (year) return `Member since ${year}`;
  return `Member since ${season}`;
}

function getInitials(name: string | null, email: string | null) {
  const value = name?.trim() || email?.trim() || "?";

  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return value.slice(0, 2).toUpperCase();
}

export default function MembersPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadMembers();

    function handleStorageChange(event: StorageEvent) {
      if (event.key === "fullout_active_team") {
        loadMembers();
      }
    }

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  async function loadMembers() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setError("You must be logged in to view members.");
        return;
      }

      setUserId(user.id);

      const storedTeamId = window.localStorage.getItem("fullout_active_team");

      if (!storedTeamId) {
        setError("No active team selected.");
        return;
      }

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("id, name, invite_code")
        .eq("id", storedTeamId)
        .single();

      if (teamError) {
        throw teamError;
      }

      setActiveTeam(team);

      const { data: membershipRows, error: membershipError } = await supabase
        .from("team_members")
        .select("id, team_id, user_id, role, member_since, member_since_year")
        .eq("team_id", storedTeamId);

      if (membershipError) {
        throw membershipError;
      }

      const memberRows = membershipRows ?? [];

      const memberUserIds = memberRows.map((member) => member.user_id);

      let profileRows: Profile[] = [];

      if (memberUserIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, name, email, avatar_url")
          .in("id", memberUserIds);

        if (profileError) {
          throw profileError;
        }

        profileRows = profiles ?? [];
      }

      const profileMap = new Map(
        profileRows.map((profile) => [profile.id, profile]),
      );

      const loadedMembers: Member[] = memberRows.map((membership) => ({
        ...membership,
        profile: profileMap.get(membership.user_id) ?? null,
      }));

      loadedMembers.sort((a, b) => {
        if (a.user_id === user.id) return -1;
        if (b.user_id === user.id) return 1;

        return (a.profile?.name ?? a.profile?.email ?? "").localeCompare(
          b.profile?.name ?? b.profile?.email ?? "",
        );
      });

      setMembers(loadedMembers);

      const myMembership = memberRows.find(
        (member) => member.user_id === user.id,
      );

      setCurrentRole(myMembership?.role ?? null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading members.",
      );
    } finally {
      setLoading(false);
    }
  }

  const isDirector = currentRole === "director";

  async function changeRole(member: Member, newRole: string) {
    if (!activeTeam || !isDirector) return;

    if (member.user_id === userId) {
      setError("You cannot change your own role.");
      return;
    }

    if (member.role === newRole) return;

    setActionLoading(member.id);
    setError("");
    setSuccess("");

    try {
      const { error: updateError } = await supabase
        .from("team_members")
        .update({
          role: newRole,
        })
        .eq("id", member.id)
        .eq("team_id", activeTeam.id);

      if (updateError) {
        throw updateError;
      }

      setMembers((currentMembers) =>
        currentMembers.map((currentMember) =>
          currentMember.id === member.id
            ? {
                ...currentMember,
                role: newRole,
              }
            : currentMember,
        ),
      );

      setSuccess(
        `${member.profile?.name ?? "Member"} is now a ${formatRole(newRole)}.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update member role.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function removeMember(member: Member) {
    if (!activeTeam || !isDirector) return;

    if (member.user_id === userId) {
      setError("You cannot remove yourself from the team.");
      return;
    }

    const memberName =
      member.profile?.name ?? member.profile?.email ?? "this member";

    const confirmed = window.confirm(
      `Remove ${memberName} from ${activeTeam.name}?\n\nThey will no longer have access to this team.`,
    );

    if (!confirmed) return;

    setActionLoading(member.id);
    setError("");
    setSuccess("");

    try {
      const { error: deleteError } = await supabase
        .from("team_members")
        .delete()
        .eq("id", member.id)
        .eq("team_id", activeTeam.id);

      if (deleteError) {
        throw deleteError;
      }

      setMembers((currentMembers) =>
        currentMembers.filter(
          (currentMember) => currentMember.id !== member.id,
        ),
      );

      setSuccess(`${memberName} was removed from the team.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove member.");
    } finally {
      setActionLoading(null);
    }
  }

  async function copyInviteCode() {
    if (!activeTeam?.invite_code) return;

    try {
      await navigator.clipboard.writeText(activeTeam.invite_code);

      setCopied(true);
      setSuccess("Invite code copied.");

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError("Unable to copy the invite code.");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 text-[#111111]">
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-40 rounded bg-gray-100" />
            <div className="h-24 rounded-xl bg-gray-100" />
            <div className="h-20 rounded-xl bg-gray-100" />
            <div className="h-20 rounded-xl bg-gray-100" />
            <div className="h-20 rounded-xl bg-gray-100" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-[#111111]">
      <AppNav />
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-sm font-medium text-gray-500">
                {activeTeam?.name ?? "Team"}
              </p>

              <h1 className="text-3xl font-semibold tracking-tight">Members</h1>

              <p className="mt-2 text-sm text-gray-500">
                Manage your team roster and roles.
              </p>
            </div>

            <div className="text-sm text-gray-500">
              {members.length} {members.length === 1 ? "member" : "members"}
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Invite Card */}
        {activeTeam?.invite_code && (
          <section className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Invite members</h2>

                <p className="mt-1 text-sm text-gray-500">
                  Share this code with dancers who want to join{" "}
                  {activeTeam.name}.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-lg font-semibold tracking-[0.18em] text-[#111111]">
                  {activeTeam.invite_code}
                </div>

                <button
                  type="button"
                  onClick={copyInviteCode}
                  className="rounded-full bg-[#2563EB] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#1D4ED8]"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Roster */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Team roster</h2>

            {isDirector && (
              <span className="text-xs font-medium text-gray-400">
                Director controls enabled
              </span>
            )}
          </div>

          {members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center">
              <h3 className="font-medium text-[#111111]">No members yet</h3>

              <p className="mt-2 text-sm text-gray-500">
                Share your invite code to start building the team.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="divide-y divide-gray-200">
                {members.map((member) => {
                  const name =
                    member.profile?.name ||
                    member.profile?.email ||
                    "Unnamed member";

                  const email = member.profile?.email ?? "";

                  const isCurrentUser = member.user_id === userId;

                  const isBusy = actionLoading === member.id;

                  return (
                    <div
                      key={member.id}
                      className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      {/* Member info */}
                      <div className="flex min-w-0 items-center gap-4">
                        {member.profile?.avatar_url ? (
                          <img
                            src={member.profile.avatar_url}
                            alt=""
                            className="h-11 w-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                            {getInitials(name, email)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-[#111111]">
                              {name}
                            </p>

                            {isCurrentUser && (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                                You
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                            <span>{formatRole(member.role)}</span>

                            <span className="text-gray-300">•</span>

                            <span>
                              {formatMemberSince(
                                member.member_since,
                                member.member_since_year,
                              )}
                            </span>
                          </div>

                          {email && (
                            <p className="mt-1 truncate text-xs text-gray-400">
                              {email}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Controls */}
                      {isDirector && !isCurrentUser ? (
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <select
                            value={member.role}
                            disabled={isBusy}
                            onChange={(event) =>
                              changeRole(member, event.target.value)
                            }
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none transition focus:border-[#2563EB] disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Change role for ${name}`}
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => removeMember(member)}
                            className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isBusy ? "Saving..." : "Remove"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                            {ROLE_DESCRIPTIONS[member.role] ??
                              formatRole(member.role)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
