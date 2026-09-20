"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppNav from "@/app/components/AppNav";
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

type SetRow = {
  id: string;
  name: string;
};

type Member = {
  user_id: string;
  name: string;
  role: string;
};

type Rehearsal = {
  id: string;
  team_id: string;
  set_id: string | null;
  title: string;
  rehearsal_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  created_by: string;
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

function formatShortDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
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

export default function CalendarPage() {
  const [userId, setUserId] = useState<string | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [activeMembership, setActiveMembership] = useState<Membership | null>(
    null,
  );

  const [sets, setSets] = useState<SetRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [selectedRehearsal, setSelectedRehearsal] = useState<Rehearsal | null>(
    null,
  );

  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("Rehearsal");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [setId, setSetId] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCalendar() {
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

      setUserId(user.id);

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

      if (!selectedTeam) {
        return;
      }

      localStorage.setItem("fullout_active_team", selectedTeam.id);

      setActiveTeam(selectedTeam);

      const selectedMembership =
        loadedMemberships.find(
          (membership) => membership.team_id === selectedTeam.id,
        ) ?? null;

      setActiveMembership(selectedMembership);

      const { data: setData, error: setsError } = await supabase
        .from("sets")
        .select("id,name")
        .eq("team_id", selectedTeam.id)
        .order("created_at", { ascending: false });

      if (setsError) {
        setError(setsError.message);
        return;
      }

      setSets(setData ?? []);

      const { data: memberData, error: membersError } = await supabase
        .from("team_members")
        .select("user_id,role")
        .eq("team_id", selectedTeam.id)
        .order("created_at", { ascending: true });

      if (membersError) {
        setError(membersError.message);
        return;
      }

      const loadedMemberData = memberData ?? [];
      const memberIds = loadedMemberData.map((member) => member.user_id);

      let profiles: Record<string, { name: string }> = {};

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
          profiles[profile.id] = {
            name: profile.name ?? "Unnamed member",
          };
        }
      }

      setMembers(
        loadedMemberData.map((member) => ({
          user_id: member.user_id,
          role: member.role,
          name: profiles[member.user_id]?.name ?? "Unnamed member",
        })),
      );

      const { data: rehearsalData, error: rehearsalError } = await supabase
        .from("rehearsals")
        .select(
          "id,team_id,set_id,title,rehearsal_date,start_time,end_time,location,notes,created_by",
        )
        .eq("team_id", selectedTeam.id)
        .order("rehearsal_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (rehearsalError) {
        setError(rehearsalError.message);
        return;
      }

      const loadedRehearsals = rehearsalData ?? [];
      setRehearsals(loadedRehearsals);

      if (loadedRehearsals.length === 0) {
        setSelectedRehearsal(null);
        setAttendance([]);
        return;
      }

      setSelectedRehearsal((current) => {
        if (
          current &&
          loadedRehearsals.some((rehearsal) => rehearsal.id === current.id)
        ) {
          return current;
        }

        return loadedRehearsals[0];
      });

      const rehearsalIds = loadedRehearsals.map((rehearsal) => rehearsal.id);

      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance_records")
        .select("id,rehearsal_id,user_id,status")
        .in("rehearsal_id", rehearsalIds);

      if (attendanceError) {
        setError(attendanceError.message);
        return;
      }

      setAttendance(attendanceData ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCalendar();
  }, []);

  async function createRehearsal(event: React.FormEvent) {
    event.preventDefault();

    if (!activeTeam) return;

    if (!title.trim() || !date) {
      setError("Please enter a title and date.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { data: rehearsalId, error: createError } = await supabase.rpc(
        "create_rehearsal",
        {
          p_team_id: activeTeam.id,
          p_set_id: setId || null,
          p_title: title.trim(),
          p_rehearsal_date: date,
          p_start_time: startTime || null,
          p_end_time: endTime || null,
          p_location: location.trim() || null,
          p_notes: notes.trim() || null,
        },
      );

      if (createError) {
        setError(createError.message);
        return;
      }

      if (!rehearsalId) {
        setError("Rehearsal was not created.");
        return;
      }

      setTitle("Rehearsal");
      setDate("");
      setStartTime("");
      setEndTime("");
      setLocation("");
      setSetId("");
      setNotes("");
      setShowCreate(false);

      await loadCalendar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function updateAttendance(memberId: string, status: string) {
    if (!selectedRehearsal) return;

    setSaving(true);
    setError("");

    try {
      const existing = attendance.find(
        (record) =>
          record.rehearsal_id === selectedRehearsal.id &&
          record.user_id === memberId,
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
            user_id: memberId,
            status,
          });

        if (insertError) {
          setError(insertError.message);
          return;
        }
      }

      await loadCalendar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function getAttendanceStatus(memberId: string) {
    return (
      attendance.find(
        (record) =>
          record.rehearsal_id === selectedRehearsal?.id &&
          record.user_id === memberId,
      )?.status ?? "present"
    );
  }

  function getSetName(setId: string | null) {
    if (!setId) return null;

    return sets.find((set) => set.id === setId)?.name ?? null;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-[#111111]">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-sm text-gray-500">Loading calendar...</p>
        </div>
      </main>
    );
  }

  if (!activeTeam) {
    return (
      <main className="min-h-screen bg-white text-[#111111]">
        <div className="mx-auto max-w-2xl px-6 py-16">
          <h1 className="text-2xl font-semibold">Welcome to FullOut</h1>

          <p className="mt-2 text-sm text-gray-500">
            Create or join a dance team to use the calendar.
          </p>

          <Link
            href="/onboarding"
            className="mt-6 inline-flex rounded-full bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white"
          >
            Get started
          </Link>
        </div>
      </main>
    );
  }

  const leader = isLeader(activeMembership?.role);

  const selectedAttendance = attendance.filter(
    (record) => record.rehearsal_id === selectedRehearsal?.id,
  );

  const presentCount = selectedAttendance.filter(
    (record) => record.status === "present",
  ).length;

  const lateCount = selectedAttendance.filter(
    (record) => record.status === "late",
  ).length;

  const absentCount = selectedAttendance.filter(
    (record) => record.status === "absent",
  ).length;

  const excusedCount = selectedAttendance.filter(
    (record) => record.status === "excused",
  ).length;

  return (
    <main className="min-h-screen bg-white text-[#111111]">
      <AppNav />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Calendar
            </h1>

            <p className="mt-1 text-sm text-gray-500">{activeTeam.name}</p>
          </div>

          {teams.length > 1 && (
            <select
              value={activeTeam.id}
              onChange={(event) => {
                localStorage.setItem("fullout_active_team", event.target.value);

                window.location.reload();
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          )}
        </header>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <section className="mt-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-semibold">Upcoming rehearsals</h2>

              <p className="mt-1 text-sm text-gray-500">
                Keep your team aligned on when and where you rehearse.
              </p>
            </div>

            {leader && (
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="rounded-full bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1D4ED8]"
              >
                {showCreate ? "Cancel" : "New rehearsal"}
              </button>
            )}
          </div>

          {showCreate && leader && (
            <form
              onSubmit={createRehearsal}
              className="mt-5 rounded-xl border border-gray-200 p-5"
            >
              <h3 className="font-semibold">Schedule rehearsal</h3>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Title</label>

                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Rehearsal"
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Date</label>

                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Start time</label>

                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">End time</label>

                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Location</label>

                  <input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Dance studio"
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Set</label>

                  <select
                    value={setId}
                    onChange={(event) => setSetId(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">No set</option>

                    {sets.map((set) => (
                      <option key={set.id} value={set.id}>
                        {set.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Notes</label>

                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="What should dancers know?"
                    rows={3}
                    className="mt-1.5 w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-5 rounded-full bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Creating..." : "Schedule rehearsal"}
              </button>
            </form>
          )}

          <div className="mt-6 grid gap-3">
            {rehearsals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
                <p className="text-sm font-medium">No rehearsals scheduled</p>

                <p className="mt-1 text-sm text-gray-500">
                  Schedule your first rehearsal to get started.
                </p>
              </div>
            ) : (
              rehearsals.map((rehearsal) => {
                const selected = selectedRehearsal?.id === rehearsal.id;

                const rehearsalSet = getSetName(rehearsal.set_id);

                return (
                  <button
                    key={rehearsal.id}
                    onClick={() => setSelectedRehearsal(rehearsal)}
                    className={`w-full rounded-xl border p-5 text-left transition ${
                      selected
                        ? "border-[#2563EB]"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{rehearsal.title}</h3>

                          {rehearsalSet && (
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                              {rehearsalSet}
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm text-gray-500">
                          {formatShortDate(rehearsal.rehearsal_date)}

                          {rehearsal.start_time &&
                            ` · ${formatTime(rehearsal.start_time)}`}

                          {rehearsal.end_time &&
                            `–${formatTime(rehearsal.end_time)}`}
                        </p>

                        {rehearsal.location && (
                          <p className="mt-1 text-sm text-gray-500">
                            {rehearsal.location}
                          </p>
                        )}
                      </div>

                      <span className="text-sm text-gray-400">→</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {selectedRehearsal && (
          <section className="mt-10">
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm text-gray-500">Selected rehearsal</p>

                  <h2 className="mt-1 text-2xl font-semibold">
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

                  {selectedRehearsal.notes && (
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600">
                      {selectedRehearsal.notes}
                    </p>
                  )}
                </div>

                <Link
                  href={`/attendance?rehearsal=${selectedRehearsal.id}`}
                  className="rounded-full bg-[#2563EB] px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-[#1D4ED8]"
                >
                  Take attendance
                </Link>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200">
              <div className="border-b border-gray-200 px-5 py-4">
                <h3 className="font-semibold">Attendance</h3>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                    {presentCount} present
                  </span>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                    {lateCount} late
                  </span>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                    {absentCount} absent
                  </span>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                    {excusedCount} excused
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {members.map((member) => {
                  const status = getAttendanceStatus(member.user_id);

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
                                    ? "border-[#2563EB] bg-[#2563EB] text-white"
                                    : "border-gray-300 text-gray-600 hover:border-[#2563EB] hover:text-[#1D4ED8]"
                                }`}
                              >
                                {option.charAt(0).toUpperCase() +
                                  option.slice(1)}
                              </button>
                            ),
                          )}
                        </div>
                      ) : (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium capitalize text-[#1D4ED8]">
                          {status}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
