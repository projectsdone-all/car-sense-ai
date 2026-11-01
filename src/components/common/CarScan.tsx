import { cn } from "@/lib/utils";

const BODY =
  "M18 92 C18 81 25 75 39 73 L80 68 C95 51 116 38 144 36 L204 36 C229 36 249 48 268 66 L298 72 C312 75 318 82 318 92 L318 99 C318 103 315 105 311 105 L292 105 A25 25 0 0 0 242 105 L110 105 A25 25 0 0 0 60 105 L26 105 C21 105 18 102 18 98 Z";

/**
 * Animated side-view car with a sweeping scan beam and pulsing damage markers.
 * Pure SVG + CSS so it ships with no images.
 */
export function CarScan({ className, markers = true }: { className?: string; markers?: boolean }) {
  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      <svg viewBox="0 0 336 140" className="relative z-10 w-full animate-float" role="img" aria-label="Car being scanned for damage">
        <defs>
          <linearGradient id="cs-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--primary-2)" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="cs-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--primary)" />
            <stop offset="1" stopColor="var(--primary-2)" />
          </linearGradient>
          <filter id="cs-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ground */}
        <ellipse cx="168" cy="128" rx="150" ry="7" fill="var(--primary)" opacity="0.12" />
        <line x1="8" y1="128" x2="328" y2="128" stroke="url(#cs-stroke)" strokeOpacity="0.35" strokeDasharray="4 6" className="animate-dash" />

        {/* body */}
        <path d={BODY} fill="url(#cs-body)" stroke="url(#cs-stroke)" strokeWidth="2" filter="url(#cs-glow)" strokeLinejoin="round" />
        {/* windows */}
        <path d="M94 68 C107 53 122 45 146 44 L172 44 L172 68 Z" fill="var(--primary)" fillOpacity="0.1" stroke="var(--primary)" strokeOpacity="0.6" strokeWidth="1.4" />
        <path d="M180 44 L204 44 C223 44 240 53 255 68 L180 68 Z" fill="var(--primary)" fillOpacity="0.1" stroke="var(--primary)" strokeOpacity="0.6" strokeWidth="1.4" />
        {/* details */}
        <path d="M176 70 L176 104" stroke="var(--primary)" strokeOpacity="0.35" strokeWidth="1.2" />
        <path d="M40 82 L58 82" stroke="var(--hot)" strokeWidth="3" strokeLinecap="round" />
        <path d="M300 80 L312 82" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
        {/* wheels */}
        {[85, 267].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="105" r="19" fill="var(--background)" stroke="url(#cs-stroke)" strokeWidth="2" />
            <circle cx={cx} cy="105" r="8" fill="none" stroke="var(--primary)" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="3 3" />
          </g>
        ))}

        {markers ? (
          <>
            <Marker x={128} y={84} color="var(--hot)" label="Dent · Front door" lx={92} ly={18} />
            <Marker x={292} y={88} color="oklch(0.86 0.15 85)" label="Crack · Bumper" lx={236} ly={18} />
          </>
        ) : null}
      </svg>

      {/* scan beam */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-1/4 animate-scan-sweep">
        <div className="absolute inset-y-2 right-0 w-[2px] bg-primary shadow-[0_0_18px_4px_var(--primary)]" />
        <div className="absolute inset-y-2 right-0 w-full bg-gradient-to-r from-transparent to-primary/25" />
      </div>
    </div>
  );
}

function Marker({ x, y, color, label, lx, ly }: { x: number; y: number; color: string; label: string; lx: number; ly: number }) {
  return (
    <g>
      <line x1={x} y1={y} x2={lx + 36} y2={ly + 10} stroke={color} strokeOpacity="0.7" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx={x} cy={y} r="4" fill={color} />
      <circle cx={x} cy={y} r="4" fill={color} style={{ transformOrigin: `${x}px ${y}px` }} className="animate-ping-soft" />
      <rect x={lx} y={ly} width="76" height="17" rx="8.5" fill="var(--background)" fillOpacity="0.85" stroke={color} strokeOpacity="0.8" />
      <text x={lx + 38} y={ly + 11.6} textAnchor="middle" fontSize="8" fontWeight="600" fill={color} fontFamily="Barlow, sans-serif">
        {label}
      </text>
    </g>
  );
}
