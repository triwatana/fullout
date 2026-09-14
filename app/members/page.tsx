"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Role = "director" | "captain" | "choreographer" | "dancer" | "alumni";

type Member = {
  id: string;
  user_id: string;
  role: Role;
  member_since: "Spring" | "Summer" | "Fall" | null;
  member_since_year: number | null;
  created_at: string;
  profile: {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

const roleLabels: Record<Role, string> = {
  director: "Director",
  captain: "Captain",
  choreographer: "Choreographer",
  dancer: "Dancer",
  alumni: "Alumni",
};

export default function MembersPage() {
  const supabase = createClient();

  const [members, setMembers] = useState<Member[]>([]);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMembers() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in.");
        setLoading(false);
        return;
      }

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("id, name")
        .eq("created_by", user.id)
        .single();

      if (teamError || !team) {
        setError("No team found.");
        setLoading(false);
        return;
      }

      setTeamName(team.name);

      const { data: memberRows, error: membersError } = await supabase
        .from("team_members")
        .select(
          "id, user_id, role, member_since, member_since_year, created_at",
        )
        .eq("team_id", team.id)
        .order("created_at", { ascending: true });

      if (membersError) {
        setError(membersError.message);
        setLoading(false);
        return;
      }

      const membersWithProfiles: Member[] = [];

      for (const member of memberRows ?? []) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, name, email, avatar_url")
          .eq("id", member.user_id)
          .single();

        membersWithProfiles.push({
          ...member,
          role: member.role as Role,
          profile: profile ?? null,
        });
      }

      setMembers(membersWithProfiles);
      setLoading(false);
    }

    loadMembers();
  }, []);

  function getInitials(name: string | null, email: string | null) {
    const value = name || email || "?";

    const parts = value.trim().split(/\s+/);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return value.slice(0, 2).toUpperCase();
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <Link
              href="/dashboard"
              className="text-xl font-bold tracking-tight"
            >
              FullOut
            </Link>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/dashboard"
              className="text-gray-500 transition hover:text-gray-900"
            >
              Dashboard
            </Link>

            <Link href="/members" className="font-medium text-gray-900">
              Members
            </Link>

            <Link
              href="/dashboard"
              className="text-gray-500 transition hover:text-gray-900"
            >
              Routines
            </Link>

            <Link
              href="/dashboard"
              className="text-gray-500 transition hover:text-gray-900"
            >
              Notifications
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-gray-500">
              {teamName || "Team"}
            </p>

            <h1 className="text-3xl font-bold tracking-tight">Members</h1>

            <p className="mt-2 text-sm text-gray-500">
              Manage your dance team and see everyone’s role.
            </p>
          </div>

          <button
            type="button"
            className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            + Add member
          </button>
        </div>

        {loading && (
          <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">
            Loading members...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && members.length === 0 && (
          <div className="rounded-xl border bg-white p-10 text-center">
            <h2 className="text-lg font-semibold">No members found</h2>

            <p className="mt-2 text-sm text-gray-500">
              Add your first team member to get started.
            </p>
          </div>
        )}

        {!loading && !error && members.length > 0 && (
          <>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {members.length} {members.length === 1 ? "member" : "members"}
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => {
                const name =
                  member.profile?.name ||
                  member.profile?.email ||
                  "Unnamed member";

                const role = roleLabels[member.role] ?? "Dancer";

                return (
                  <div
                    key={member.id}
                    className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      {member.profile?.avatar_url ? (
                        <img
                          src={member.profile.avatar_url}
                          alt={name}
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                          {getInitials(
                            member.profile?.name ?? null,
                            member.profile?.email ?? null,
                          )}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h2 className="truncate font-semibold">{name}</h2>

                        <p className="mt-1 text-sm text-gray-500">{role}</p>
                      </div>
                    </div>

                    <div className="mt-6 border-t pt-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        Member since
                      </p>

                      <p className="mt-1 text-sm font-medium text-gray-700">
                        {member.member_since && member.member_since_year
                          ? `${member.member_since} ${member.member_since_year}`
                          : "Not specified"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
