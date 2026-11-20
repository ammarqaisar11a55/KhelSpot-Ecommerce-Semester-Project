import { SpotLogo } from "./SpotLogo";

type LogoMarkProps = {
  size?: number;
  className?: string;
};

/**
 * Spot symbol from brand kit v1.0: a heavy K with the dot at its shoulder.
 * For icons, avatars and favicons only; use <SpotLogo /> wherever there is room.
 */
export function LogoMark({ size = 28, className }: LogoMarkProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14.4" fill="#1F7A4D" />
      <path d="M18 14.5h8v14.2L36.3 14.5h9.2L34.6 29.4 46 49.5h-9.3l-7.8-14.4-2.9 3.9v10.5h-8z" fill="#F3F2EC" />
      <circle cx="47" cy="15.5" r="6" fill="#D4F53C" />
    </svg>
  );
}

/** Text lockup, kept for compatibility: renders the Spot wordmark. */
export function Wordmark() {
  return <SpotLogo on="dark" size={22} />;
}
