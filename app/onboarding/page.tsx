"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Choice = "join" | "create" | null;

type Role = "director" | "captain" | "choreographer" | "dancer" | "alumni";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [choice, setChoice] = useState<Choice>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");

  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [role, setRole] = useState<Role>("dancer");
  const [memberSince, setMemberSince] = useState("Fall");
  const [memberSinceYear, setMemberSinceYear] = useState(
    new Date().getFullYear().toString(),
  );

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setName(user.user_metadata?.name || "");
      setLoading(false);
    }

    loadUser();
  }, [router, supabase]);

  async function createTeam() {
    setError("");

    if (!teamName.trim()) {
      setError("Please enter a team name.");
      return;
    }

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const invite = crypto
        .randomUUID()
        .replace(/-/g, "")
        .substring(0, 8)
        .toUpperCase();

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: teamName.trim(),
          created_by: user.id,
          invite_code: invite,
        })
        .select()
        .single();

      if (teamError) {
        throw teamError;
      }

      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: team.id,
          user_id: user.id,
          role,
          member_since: memberSince,
          member_since_year: Number(memberSinceYear),
        });

      if (memberError) {
        throw memberError;
      }

      await supabase
        .from("profiles")
        .update({
          name: name.trim(),
        })
        .eq("id", user.id);

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function joinTeam() {
    setError("");

    if (!inviteCode.trim()) {
      setError("Please enter your team invite code.");
      return;
    }

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setSubmitting(true);

    try {
      const { data: teamId, error: joinError } = await supabase.rpc(
        "join_team",
        {
          p_invite_code: inviteCode.trim(),
          p_role: role,
          p_member_since: memberSince,
          p_member_since_year: Number(memberSinceYear),
        },
      );

      if (joinError) {
        throw joinError;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("profiles")
          .update({
            name: name.trim(),
          })
          .eq("id", user.id);
      }

      if (!teamId) {
        throw new Error("Unable to find that team.");
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 text-black">
        <div className="mx-auto max-w-2xl px-6 py-20">
          <div className="animate-pulse">
            <div className="mx-auto h-8 w-48 rounded bg-gray-200" />
            <div className="mx-auto mt-4 h-4 w-64 rounded bg-gray-200" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-black">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-xl font-bold tracking-tight">FullOut</div>

          <button
            onClick={() =>
              supabase.auth.signOut().then(() => router.push("/login"))
            }
            className="text-sm text-gray-500 hover:text-black"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="mx-auto flex max-w-2xl justify-center px-6 py-16">
        <div className="w-full">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome to FullOut
            </h1>
            <p className="mt-3 text-sm text-gray-500">
              {name
                ? `Welcome, ${name}. Let's get your team set up.`
                : "Let's get your team set up."}
            </p>
          </div>

          {!choice ? (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setChoice("join");
                  setError("");
                }}
                className="w-full rounded-xl border bg-white p-6 text-left shadow-sm transition hover:border-gray-400 hover:shadow-md"
              >
                <div className="text-lg font-semibold">
                  Join an existing team
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  I already have a team and want to join it.
                </p>
              </button>

              <button
                onClick={() => {
                  setChoice("create");
                  setError("");
                }}
                className="w-full rounded-xl border bg-white p-6 text-left shadow-sm transition hover:border-gray-400 hover:shadow-md"
              >
                <div className="text-lg font-semibold">Create a new team</div>
                <p className="mt-2 text-sm text-gray-500">
                  I&apos;m starting a new team or creating one for my group.
                </p>
              </button>
            </div>
          ) : (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <button
                onClick={() => {
                  setChoice(null);
                  setError("");
                }}
                className="mb-6 text-sm font-medium text-gray-500 hover:text-black"
              >
                ← Back
              </button>

              <h2 className="text-xl font-semibold">
                {choice === "join"
                  ? "Join an existing team"
                  : "Create a new team"}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                {choice === "join"
                  ? "Enter your team invite code to join."
                  : "Set up your team to get started with FullOut."}
              </p>

              {error && (
                <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-8 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Your name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tri Watanasuparp"
                    className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </div>

                {choice === "create" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Team name
                    </label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Criss Cross"
                      className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-black"
                    />
                  </div>
                )}

                {choice === "join" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Team invite code
                    </label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) =>
                        setInviteCode(e.target.value.toUpperCase())
                      }
                      placeholder="A82F19CD"
                      maxLength={8}
                      className="w-full rounded-lg border px-4 py-3 text-sm uppercase outline-none focus:border-black"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Your role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none focus:border-black"
                  >
                    <option value="director">Director</option>
                    <option value="captain">Captain</option>
                    <option value="choreographer">Choreographer</option>
                    <option value="dancer">Dancer</option>
                    <option value="alumni">Alumni</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Member since
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={memberSince}
                      onChange={(e) => setMemberSince(e.target.value)}
                      className="w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none focus:border-black"
                    >
                      <option value="Spring">Spring</option>
                      <option value="Summer">Summer</option>
                      <option value="Fall">Fall</option>
                    </select>

                    <input
                      type="number"
                      value={memberSinceYear}
                      onChange={(e) => setMemberSinceYear(e.target.value)}
                      min="2000"
                      max="2100"
                      className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-black"
                    />
                  </div>
                </div>

                <button
                  onClick={choice === "create" ? createTeam : joinTeam}
                  disabled={submitting}
                  className="w-full rounded-lg bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Setting up..."
                    : choice === "create"
                      ? "Create team"
                      : "Join team"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
