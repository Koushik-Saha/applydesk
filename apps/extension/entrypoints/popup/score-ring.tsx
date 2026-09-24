// Compact mirror of apps/web/src/components/score-ring.tsx sized for the
// 360px popup — kept local rather than shared since it's a small, purely
// presentational SVG tied to the same CSS tokens the popup already loads.
const BAND_COLOR: Record<string, string> = {
  Strong: "var(--met)",
  Good: "var(--partial)",
  Stretch: "var(--stretch)",
  Weak: "var(--missing)",
};

export function MiniScoreRing({ score, band, size = 56 }: { score: number; band: string; size?: number }) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = BAND_COLOR[band] ?? "var(--text-muted)";

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-mono text-sm text-text">
          {score}
        </div>
      </div>
      <span className="text-sm font-medium" style={{ color }}>
        {band}
      </span>
    </div>
  );
}
