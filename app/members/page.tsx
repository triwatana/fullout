"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Team = {
  id: string;
  name: string;
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

type Member = {
  id: string;
  user_id: string;
  role: string;
  member_since: string | null;
  member_since_year: number | null;
  name: string;
  email: string;
  avatar_url: string | null;
};

const roles = ["director", "captain", "choreographer", "dancer", "alumni"];

const seasons = ["Spring", "Summer", "Fall"];

export default function MembersPage() {
  const supabase = createClient();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [adding, setAdding] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("dancer");
  const [memberSince, setMemberSince] = useState("Fall");
  const [memberSinceYear, setMemberSinceYear] = useState(
    new Date().getFullYear().toString(),
  );

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
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
      .select("id, team_id, user_id, role, member_since, member_since_year")
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

    const { data: teamMemberships, error: teamMembersError } = await supabase
      .from("team_members")
      .select("id, team_id, user_id, role, member_since, member_since_year")
      .eq("team_id", selectedTeamId)
      .order("created_at", { ascending: true });

    if (teamMembersError) {
      setError(teamMembersError.message);
      setLoading(false);
      return;
    }

    const memberRows = (teamMemberships || []) as Membership[];

    if (memberRows.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const userIds = memberRows.map((member) => member.user_id);

    const { data: profileRows, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, email, avatar_url")
      .in("id", userIds);

    if (profilesError) {
      setError(profilesError.message);
      setLoading(false);
      return;
    }

    const profiles = (profileRows || []) as Profile[];

    const formattedMembers: Member[] = memberRows.map((member) => {
      const profile = profiles.find(
        (profileRow) => profileRow.id === member.user_id,
      );

      return {
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        member_since: member.member_since,
        member_since_year: member.member_since_year,
        name: profile?.name || "Unknown member",
        email: profile?.email || "",
        avatar_url: profile?.avatar_url || null,
      };
    });

    setMembers(formattedMembers);
    setLoading(false);
  }

  async function addMember(event: React.FormEvent) {
    event.preventDefault();

    if (!team) return;

    setAdding(true);
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter an email address.");
      setAdding(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, email, avatar_url")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileError) {
      setError(profileError.message);
      setAdding(false);
      return;
    }

    if (!profile) {
      setError(
        "No FullOut account exists with this email. They need to sign up first.",
      );
      setAdding(false);
      return;
    }

    const { error: insertError } = await supabase.from("team_members").insert({
      team_id: team.id,
      user_id: profile.id,
      role,
      member_since: memberSince,
      member_since_year: Number(memberSinceYear),
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setError("This person is already a member of this team.");
      } else {
        setError(insertError.message);
      }

      setAdding(false);
      return;
    }

    setName("");
    setEmail("");
    setRole("dancer");
    setMemberSince("Fall");
    setMemberSinceYear(new Date().getFullYear().toString());
    setShowModal(false);
    setAdding(false);

    await loadMembers();
  }

  function getInitials(memberName: string) {
    return memberName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function formatRole(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="animate-pulse space-y-5">
            <div className="h-8 w-32 rounded bg-gray-200" />
            <div className="h-6 w-48 rounded bg-gray-200" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="h-40 rounded-2xl bg-gray-200" />
              <div className="h-40 rounded-2xl bg-gray-200" />
              <div className="h-40 rounded-2xl bg-gray-200" />
            </div>
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

            <Link href="/members" className="font-medium text-gray-900">
              Members
            </Link>

            <Link href="/sets" className="text-gray-600 hover:text-gray-900">
              Sets
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Dashboard
        </Link>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">{team?.name}</p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">Members</h1>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Add member
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {members.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              No members yet
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Add your first team member to get started.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl border border-gray-200 bg-white p-5"
              >
                <div className="flex items-center gap-4">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                      {getInitials(member.name)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-gray-900">
                      {member.name}
                    </h2>

                    {member.email && (
                      <p className="truncate text-sm text-gray-500">
                        {member.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    {formatRole(member.role)}
                  </span>

                  {member.member_since && member.member_since_year && (
                    <span className="text-xs text-gray-500">
                      Member Since {member.member_since}{" "}
                      {member.member_since_year}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Add member
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={addMember} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Name
                </label>

                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Member name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>

                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="member@email.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                />

                <p className="mt-1 text-xs text-gray-500">
                  The person must already have a FullOut account.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Role
                </label>

                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                >
                  {roles.map((item) => (
                    <option key={item} value={item}>
                      {formatRole(item)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Member since
                  </label>

                  <select
                    value={memberSince}
                    onChange={(event) => setMemberSince(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  >
                    {seasons.map((season) => (
                      <option key={season} value={season}>
                        {season}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Year
                  </label>

                  <input
                    type="number"
                    value={memberSinceYear}
                    onChange={(event) => setMemberSinceYear(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={adding}
                className="w-full rounded-lg bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adding ? "Adding..." : "Add member"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
