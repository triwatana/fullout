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
      <span className="relative h-9 w-9 shrink-0" aria-hidden="true">
        {/* F — bright electric blue */}
        <span className="absolute left-0 top-0 h-[13px] w-8 -skew-x-[24deg] rounded-[4px] bg-[#3B82F6]" />

        {/* F — deep contrasting blue */}
        <span className="absolute left-[3px] top-[11px] h-[9px] w-[21px] -skew-x-[24deg] rounded-[4px] bg-[#1E3A8A]" />

        {/* F — lime energy stroke */}
        <span className="absolute left-[1px] top-[20px] h-[10px] w-[26px] -skew-x-[24deg] rounded-[4px] bg-[#A3E635]" />
      </span>

      <span
        className={`text-[1.55rem] font-black tracking-[-0.055em] ${
          light ? "text-white" : "text-[#111111]"
        }`}
      >
        Full<span className="text-[#3B82F6]">Out</span>
      </span>
    </Link>
  );
}
