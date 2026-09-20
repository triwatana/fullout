import Link from "next/link";
import BrandLogo from "@/app/components/BrandLogo";

const features = [
  {
    title: "Team Management",
    description: "Keep your roster organized and your whole team aligned.",
    icon: "people",
  },
  {
    title: "Schedules & Events",
    description: "Keep rehearsals, competitions, and deadlines in one place.",
    icon: "calendar",
  },
  {
    title: "Videos & Feedback",
    description:
      "Share choreography, review videos, and make corrections together.",
    icon: "play",
  },
  {
    title: "Group Chat",
    description: "Stay connected on and off the floor without the chaos.",
    icon: "chat",
  },
  {
    title: "Files & Resources",
    description: "Keep music, links, documents, and resources easy to find.",
    icon: "file",
  },
];

function FeatureIcon({ type }: { type: string }) {
  if (type === "people") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3.5 19c.7-3.1 2.6-4.7 5.5-4.7s4.8 1.6 5.5 4.7" />
        <path d="M14.5 14.8c2.9-.1 4.8 1.3 5.5 4.2" />
      </svg>
    );
  }

  if (type === "calendar") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M7 3.5v4M17 3.5v4M3.5 9h17" />
        <path d="M8 13h2M14 13h2M8 16.5h2" />
      </svg>
    );
  }

  if (type === "play") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="m10 8 5 4-5 4V8Z" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (type === "chat") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M5 5.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 3v-3H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
        <path
          d="M8 11.5h.01M12 11.5h.01M16 11.5h.01"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4M8 12h8M8 15.5h6" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#111111]">
      {/* Navigation */}
      <nav className="relative z-20 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-8">
          <BrandLogo href="/" />

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-semibold text-gray-600 transition hover:text-[#2563EB]"
            >
              Features
            </a>
            <a
              href="#benefits"
              className="text-sm font-semibold text-gray-600 transition hover:text-[#2563EB]"
            >
              Benefits
            </a>
            <a
              href="#teams"
              className="text-sm font-semibold text-gray-600 transition hover:text-[#2563EB]"
            >
              For Teams
            </a>
            <a
              href="#pricing"
              className="text-sm font-semibold text-gray-600 transition hover:text-[#2563EB]"
            >
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden text-sm font-semibold text-gray-500 transition hover:text-[#111111] sm:block"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[#2563EB] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1D4ED8]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -right-40 top-20 h-[520px] w-[520px] rounded-full bg-blue-50" />
        <div className="absolute -left-40 bottom-0 h-[320px] w-[320px] rounded-full bg-lime-50" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 pb-14 pt-14 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-20 lg:pt-20">
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <span className="h-1.5 w-14 rounded-full bg-[#A3E635]" />
            </div>

            <p className="mt-2 text-md font-bold uppercase tracking-[0.16em] text-[#334E75]">
              The all-in-one workspace for dance teams
            </p>

            <h1 className="mt-7 max-w-3xl text-[3.7rem] font-black leading-[0.94] tracking-[-0.055em] sm:text-6xl lg:text-[5.25rem]">
              More dancing.
              <br />
              Less chaos.
              <br />
              All in{" "}
              <span className="relative inline-block text-[#2563EB]">
                FullOut
                <span className="absolute -bottom-1 left-0 h-2 w-full -rotate-1 rounded-full bg-[#A3E635]" />
              </span>
              .
            </h1>

            <p className="mt-8 max-w-xl text-lg leading-8 text-gray-600">
              Manage your team, share videos, track progress, and stay connected
              — all in one place, built specifically for dance teams.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="group rounded-full bg-[#2563EB] px-7 py-4 text-base font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-[#1D4ED8]"
              >
                Get Started{" "}
                <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <a
                href="#features"
                className="rounded-full border border-gray-300 px-7 py-4 text-base font-bold text-gray-700 transition hover:border-[#2563EB] hover:text-[#1D4ED8]"
              >
                Explore FullOut
              </a>
            </div>
          </div>

          {/* Dance-inspired visual */}
          <div className="relative mx-auto h-[520px] w-full max-w-[620px] lg:h-[620px]">
            <div className="absolute right-8 top-14 h-[310px] w-[470px] rotate-[-18deg] rounded-[38%] bg-[#2563EB] sm:right-12 sm:w-[520px] lg:top-20" />
            <div className="absolute right-10 top-56 h-24 w-[350px] rotate-[-20deg] rounded-full bg-[#A3E635] sm:w-[420px] lg:right-4 lg:top-72" />

            {/* Stylized dancer silhouette */}
            <div className="absolute bottom-5 left-1/2 h-[455px] w-[290px] -translate-x-1/2 sm:h-[500px] sm:w-[340px]">
              <div className="absolute left-1/2 top-5 h-24 w-24 -translate-x-1/2 rounded-full bg-[#111827] sm:h-28 sm:w-28" />
              <div className="absolute left-1/2 top-28 h-[270px] w-[150px] -translate-x-1/2 rotate-[7deg] rounded-[48%] bg-[#111827] sm:h-[315px] sm:w-[175px]" />
              <div className="absolute left-8 top-36 h-5 w-52 -rotate-[43deg] rounded-full bg-[#111827] sm:left-2 sm:w-64" />
              <div className="absolute right-0 top-36 h-5 w-52 rotate-[24deg] rounded-full bg-[#111827] sm:w-64" />
              <div className="absolute bottom-0 left-14 h-7 w-64 -rotate-[22deg] rounded-full bg-[#111827] sm:left-8 sm:w-80" />
              <div className="absolute bottom-1 right-0 h-7 w-60 rotate-[13deg] rounded-full bg-[#111827] sm:w-72" />
            </div>

            <div className="absolute bottom-12 left-4 rounded-2xl border border-white/70 bg-white/90 px-5 py-4 shadow-xl backdrop-blur sm:left-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1D4ED8]">
                Built for dance teams
              </p>
              <p className="mt-1 text-xl font-black tracking-tight">
                Plan. Rehearse. Refine. Perform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section id="features" className="border-y border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl divide-y divide-gray-200 px-6 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5 lg:px-8">
          {features.map((feature) => (
            <div key={feature.title} className="px-6 py-8 first:pl-0">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                <FeatureIcon type={feature.icon} />
              </div>
              <h2 className="text-sm font-bold text-[#111111]">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm leading-5 text-gray-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="bg-gray-50 px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#2563EB]">
              Built around your team
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] sm:text-5xl">
              Everything your team needs.
              <br />
              Nothing getting in the way.
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Stop jumping between group chats, shared drives, spreadsheets,
              calendars, and video links. FullOut brings the workflow together.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              [
                "Stay organized",
                "Keep members, sets, rehearsals, videos, and feedback connected.",
                "bg-[#2563EB]",
              ],
              [
                "Improve together",
                "Turn rehearsal feedback into clear, actionable corrections.",
                "bg-[#A3E635]",
              ],
              [
                "Keep everyone connected",
                "Give dancers and leaders one shared place to communicate.",
                "bg-[#111111]",
              ],
            ].map(([title, text, accent]) => (
              <div
                key={title}
                className="rounded-2xl border border-gray-200 bg-white p-7"
              >
                <span className={`block h-2 w-14 rounded-full ${accent}`} />
                <h3 className="mt-6 text-xl font-black">{title}</h3>
                <p className="mt-3 leading-7 text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team section */}
      <section
        id="teams"
        className="relative overflow-hidden bg-[#111827] px-6 py-24 text-white lg:px-8"
      >
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#2563EB] opacity-80 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-[#A3E635] opacity-40 blur-3xl" />
        <div className="relative mx-auto max-w-5xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#A3E635]">
            Built for dance teams
          </p>
          <h2 className="mt-5 text-4xl font-black tracking-[-0.04em] sm:text-6xl">
            Same team.
            <br />
            Bigger goals.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-300">
            Whether you're a college team, studio, competition team, or
            independent crew, FullOut gives everyone a shared workspace.
          </p>
          <Link
            href="/signup"
            className="mt-9 inline-flex rounded-full bg-[#A3E635] px-8 py-4 font-black text-[#111827] transition hover:bg-lime-300"
          >
            Build your team <span className="ml-3">→</span>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="px-6 py-24 text-center lg:px-8">
        <div className="mx-auto max-w-3xl">
          <span className="mx-auto block h-2 w-16 rounded-full bg-[#A3E635]" />
          <h2 className="mt-7 text-4xl font-black tracking-[-0.04em] sm:text-6xl">
            Ready to go <span className="text-[#2563EB]">FullOut</span>?
          </h2>
          <p className="mt-6 text-lg text-gray-600">
            Less chaos between rehearsals. More time to focus on the work that
            matters.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex rounded-full bg-[#2563EB] px-8 py-4 font-black text-white shadow-lg shadow-blue-100 transition hover:bg-[#1D4ED8]"
          >
            Get Started <span className="ml-3">→</span>
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-200 px-6 py-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <BrandLogo href="/" />
          <p className="text-sm text-gray-500">
            Built for dance teams, by a dancer.
          </p>
        </div>
      </footer>
    </main>
  );
}
