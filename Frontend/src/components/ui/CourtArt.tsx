import type { Sport } from "@/lib/domain/types";

/** Top-down court drawing used as the venue "photo" until real images exist. */
export function CourtArt({ sport, className }: { sport: Sport; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 320 140" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="320" height="140" fill="#111513" />
      <g fill="none" stroke="#2C5A43" strokeWidth="2">
        {sport === "padel" && (
          <>
            <rect x="40" y="20" width="240" height="100" rx="4" />
            <line x1="160" y1="20" x2="160" y2="120" stroke="#F3F2EC" />
            <line x1="90" y1="20" x2="90" y2="120" />
            <line x1="230" y1="20" x2="230" y2="120" />
            <line x1="90" y1="70" x2="230" y2="70" />
          </>
        )}
        {sport === "futsal" && (
          <>
            <rect x="30" y="16" width="260" height="108" rx="4" />
            <line x1="160" y1="16" x2="160" y2="124" />
            <circle cx="160" cy="70" r="20" />
            <path d="M30 45h28a25 25 0 0 1 0 50H30M290 45h-28a25 25 0 0 0 0 50h28" />
          </>
        )}
        {sport === "cricket" && (
          <>
            <rect x="24" y="16" width="272" height="108" rx="4" />
            <rect x="110" y="58" width="100" height="24" />
            <line x1="122" y1="52" x2="122" y2="88" />
            <line x1="198" y1="52" x2="198" y2="88" />
          </>
        )}
        {sport === "badminton" && (
          <>
            <rect x="50" y="22" width="220" height="96" rx="2" />
            <line x1="160" y1="22" x2="160" y2="118" stroke="#F3F2EC" />
            <line x1="134" y1="22" x2="134" y2="118" />
            <line x1="186" y1="22" x2="186" y2="118" />
            <line x1="50" y1="70" x2="134" y2="70" />
            <line x1="186" y1="70" x2="270" y2="70" />
            <line x1="50" y1="30" x2="270" y2="30" />
            <line x1="50" y1="110" x2="270" y2="110" />
          </>
        )}
      </g>
      <circle cx="214" cy="46" r="5" fill="#D4F53C" />
    </svg>
  );
}
