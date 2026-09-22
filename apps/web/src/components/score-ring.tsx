"use client";

import { useEffect, useState } from "react";

// DESIGN.md §5/§8 — "Score ring (mono number inside, band label under it)."
// "Score ring animates from 0 once on first view. Respect
// prefers-reduced-motion."
const BAND_COLOR: Record<string, string> = {
  Strong: "var(--met)",
  Good: "var(--partial)",
  Stretch: "var(--stretch)",
  Weak: "var(--missing)",
};

export function ScoreRing({ score, band, size = 96 }: { score: number; band: string; size?: number }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setAnimated(score);
      return;
    }
    const frame = requestAnimationFrame(() => setAnimated(score));
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - animated / 100);
  const color = BAND_COLOR[band] ?? "var(--text-muted)";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
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
            style={{ transition: "stroke-dashoffset 700ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-mono text-2xl">{score}</div>
      </div>
      <span className="text-sm font-medium" style={{ color }}>
        {band}
      </span>
    </div>
  );
}
