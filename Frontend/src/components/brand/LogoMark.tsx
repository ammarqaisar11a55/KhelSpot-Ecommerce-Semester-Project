type LogoMarkProps = {
  size?: number;
  className?: string;
};

/** KhelSpot symbol: a map pin whose head is a court seen from above. */
export function LogoMark({ size = 28, className }: LogoMarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={(size * 80) / 64}
      viewBox="0 0 64 80"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M16 4H48A12 12 0 0 1 60 16V44A12 12 0 0 1 48 56H40L32 72L24 56H16A12 12 0 0 1 4 44V16A12 12 0 0 1 16 4Z"
        fill="#17804F"
      />
      <rect x="14" y="14" width="36" height="32" rx="2" fill="none" stroke="#F6F3EA" strokeWidth="3" />
      <line x1="32" y1="14" x2="32" y2="46" stroke="#F6F3EA" strokeWidth="3" />
      <circle cx="42" cy="24" r="4.5" fill="#FFD43B" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span>
      Khel<em>Spot</em>
    </span>
  );
}
