"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
};

type Member = {
  user_id: string;
  name: string;
  role: string;
};

type Rehearsal = {
  id: string;
  title: string;
  rehearsal_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
};

type AttendanceRecord = {
  id: string;
  rehearsal_id: string;
  user_id: string;
  status: string;
};

const supabase = createClient();

function isLeader(role: string | undefined) {
  return role === "director" || role === "captain" || role === "choreographer";
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string | null) {
  if (!time) return "";

  const [hourString, minute] = time.split(":");
  const hour = Number(hourString);

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

export default function AttendancePage() {
  const searchParams = useSearchParams();
  const rehearsalParam = searchParams.get("rehearsal");

  const [teams, setTeams] = useState<Team[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  const [activeTeam, setActiveTeam] = useState<Team | null>(null);

  const [activeMembership, setActiveMembership] = useState<Membership | null>(
    null,
  );

  const [members, setMembers] = useState<Member[]>([]);
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const [selectedRehearsal, setSelectedRehearsal] = useState<Rehearsal | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadAttendance() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

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
        return;
      }

      const teamIds = loadedMemberships.map((membership) => membership.team_id);

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

      const savedTeamId = localStorage.getItem("fullout_active_team");

      const selectedTeam =
        loadedTeams.find((team) => team.id === savedTeamId) ??
        loadedTeams[0] ??
        null;

      if (!selectedTeam) return;

      localStorage.setItem("fullout_active_team", selectedTeam.id);

      setActiveTeam(selectedTeam);

      const membership =
        loadedMemberships.find((item) => item.team_id === selectedTeam.id) ??
        null;

      setActiveMembership(membership);

      const { data: memberData, error: membersError } = await supabase
        .from("team_members")
        .select("user_id,role")
        .eq("team_id", selectedTeam.id)
        .order("created_at", { ascending: true });

      if (membersError) {
        setError(membersError.message);
        return;
      }

      const loadedMembers = memberData ?? [];

      const memberIds = loadedMembers.map((member) => member.user_id);

      let profileMap: Record<string, string> = {};

      if (memberIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id,name")
          .in("id", memberIds);

        if (profileError) {
          setError(profileError.message);
          return;
        }

        for (const profile of profileData ?? []) {
          profileMap[profile.id] = profile.name ?? "Unnamed member";
        }
      }

      setMembers(
        loadedMembers.map((member) => ({
          user_id: member.user_id,
          role: member.role,
          name: profileMap[member.user_id] ?? "Unnamed member",
        })),
      );

      const { data: rehearsalData, error: rehearsalError } = await supabase
        .from("rehearsals")
        .select("id,title,rehearsal_date,start_time,end_time,location")
        .eq("team_id", selectedTeam.id)
        .order("rehearsal_date", {
          ascending: false,
        })
        .order("start_time", {
          ascending: false,
        });

      if (rehearsalError) {
        setError(rehearsalError.message);
        return;
      }

      const loadedRehearsals = rehearsalData ?? [];

      setRehearsals(loadedRehearsals);

      if (loadedRehearsals.length === 0) {
        setSelectedRehearsal(null);
        setRecords([]);
        return;
      }

      const requestedRehearsal = rehearsalParam
        ? loadedRehearsals.find((rehearsal) => rehearsal.id === rehearsalParam)
        : null;

      setSelectedRehearsal(requestedRehearsal ?? loadedRehearsals[0]);

      const rehearsalIds = loadedRehearsals.map((rehearsal) => rehearsal.id);

      const { data: recordData, error: recordsError } = await supabase
        .from("attendance_records")
        .select("id,rehearsal_id,user_id,status")
        .in("rehearsal_id", rehearsalIds);

      if (recordsError) {
        setError(recordsError.message);
        return;
      }

      setRecords(recordData ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAttendance();
  }, [rehearsalParam]);

  async function updateAttendance(userId: string, status: string) {
    if (!selectedRehearsal) return;

    setSaving(true);
    setError("");

    try {
      const existing = records.find(
        (record) =>
          record.rehearsal_id === selectedRehearsal.id &&
          record.user_id === userId,
      );

      if (existing) {
        const { error: updateError } = await supabase
          .from("attendance_records")
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateError) {
          setError(updateError.message);
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from("attendance_records")
          .insert({
            rehearsal_id: selectedRehearsal.id,
            user_id: userId,
            status,
          });

        if (insertError) {
          setError(insertError.message);
          return;
        }
      }

      await loadAttendance();
    } finally {
      setSaving(false);
    }
  }

  function getStatus(userId: string) {
    return (
      records.find(
        (record) =>
          record.rehearsal_id === selectedRehearsal?.id &&
          record.user_id === userId,
      )?.status ?? "present"
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-black">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <p className="text-sm text-gray-500">Loading attendance...</p>
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
            Create or join a dance team first.
          </p>

          <Link
            href="/onboarding"
            className="mt-6 inline-flex rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white"
          >
            Get started
          </Link>
        </div>
      </main>
    );
  }

  const leader = isLeader(activeMembership?.role);

  const selectedRecords = records.filter(
    (record) => record.rehearsal_id === selectedRehearsal?.id,
  );

  const present = selectedRecords.filter(
    (record) => record.status === "present",
  ).length;

  const late = selectedRecords.filter(
    (record) => record.status === "late",
  ).length;

  const absent = selectedRecords.filter(
    (record) => record.status === "absent",
  ).length;

  const excused = selectedRecords.filter(
    (record) => record.status === "excused",
  ).length;

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <header>
          <Link
            href="/calendar"
            className="text-sm text-gray-500 hover:text-black"
          >
            ← Calendar
          </Link>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Attendance
          </h1>

          <p className="mt-1 text-sm text-gray-500">{activeTeam.name}</p>
        </header>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {rehearsals.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <p className="font-medium">No rehearsals yet</p>

            <p className="mt-1 text-sm text-gray-500">
              Create a rehearsal from the calendar first.
            </p>

            <Link
              href="/calendar"
              className="mt-4 inline-block text-sm font-medium hover:underline"
            >
              Go to calendar →
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8">
              <label className="text-sm font-medium">Rehearsal</label>

              <select
                value={selectedRehearsal?.id ?? ""}
                onChange={(event) => {
                  const rehearsal = rehearsals.find(
                    (item) => item.id === event.target.value,
                  );

                  setSelectedRehearsal(rehearsal ?? null);
                }}
                className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
              >
                {rehearsals.map((rehearsal) => (
                  <option key={rehearsal.id} value={rehearsal.id}>
                    {rehearsal.title} · {rehearsal.rehearsal_date}
                  </option>
                ))}
              </select>
            </div>

            {selectedRehearsal && (
              <>
                <section className="mt-6 rounded-xl border border-gray-200 p-5">
                  <h2 className="text-xl font-semibold">
                    {selectedRehearsal.title}
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    {formatDate(selectedRehearsal.rehearsal_date)}

                    {selectedRehearsal.start_time &&
                      ` · ${formatTime(selectedRehearsal.start_time)}`}

                    {selectedRehearsal.end_time &&
                      `–${formatTime(selectedRehearsal.end_time)}`}
                  </p>

                  {selectedRehearsal.location && (
                    <p className="mt-1 text-sm text-gray-500">
                      {selectedRehearsal.location}
                    </p>
                  )}
                </section>

                <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-2xl font-semibold">{present}</p>
                    <p className="mt-1 text-xs text-gray-500">Present</p>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-2xl font-semibold">{late}</p>
                    <p className="mt-1 text-xs text-gray-500">Late</p>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-2xl font-semibold">{absent}</p>
                    <p className="mt-1 text-xs text-gray-500">Absent</p>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-2xl font-semibold">{excused}</p>
                    <p className="mt-1 text-xs text-gray-500">Excused</p>
                  </div>
                </section>

                <section className="mt-5 rounded-xl border border-gray-200">
                  <div className="border-b border-gray-200 px-5 py-4">
                    <h2 className="font-semibold">Team attendance</h2>

                    <p className="mt-1 text-sm text-gray-500">
                      {members.length} members
                    </p>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {members.map((member) => {
                      const status = getStatus(member.user_id);

                      return (
                        <div
                          key={member.user_id}
                          className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>

                            <p className="mt-1 text-xs capitalize text-gray-500">
                              {member.role}
                            </p>
                          </div>

                          {leader ? (
                            <div className="flex flex-wrap gap-2">
                              {["present", "late", "absent", "excused"].map(
                                (option) => (
                                  <button
                                    key={option}
                                    onClick={() =>
                                      updateAttendance(member.user_id, option)
                                    }
                                    disabled={saving}
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                                      status === option
                                        ? "border-black bg-black text-white"
                                        : "border-gray-300 text-gray-600 hover:border-black hover:text-black"
                                    }`}
                                  >
                                    {option.charAt(0).toUpperCase() +
                                      option.slice(1)}
                                  </button>
                                ),
                              )}
                            </div>
                          ) : (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-600">
                              {status}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
