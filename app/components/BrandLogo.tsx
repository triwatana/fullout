import Link from "next/link";

export default function BrandLogo({
  href = "/dashboard",
  light = false,
}: {
  href?: string;
  light?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5"
      aria-label="FullOut home"
    >
      <span className="relative h-8 w-9 shrink-0" aria-hidden="true">
        <span className="absolute left-0 top-0 h-4 w-8 -skew-x-[28deg] rounded-[3px] bg-[#2563EB]" />
        <span className="absolute left-0.5 top-[9px] h-4 w-7 -skew-x-[28deg] rounded-[3px] bg-[#1D4ED8]" />
        <span className="absolute left-2.5 top-[19px] h-2.5 w-5 -skew-x-[28deg] rounded-[3px] bg-[#A3E635]" />
      </span>
      <span
        className={`text-[1.55rem] font-black tracking-[-0.055em] ${light ? "text-white" : "text-[#111111]"}`}
      >
        Full<span className="text-[#2563EB]">Out</span>
      </span>
    </Link>
  );
}
