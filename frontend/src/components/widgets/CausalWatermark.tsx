/** Faint lower-triangular causal-mask watermark (Section 2.3). */

export function CausalWatermark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      preserveAspectRatio="xMinYMax meet"
    >
      <defs>
        <pattern id="causal-tri-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path
            d="M0 24 H24 V0"
            fill="none"
            stroke="var(--text-tertiary)"
            strokeWidth="0.5"
            opacity="1"
          />
          <path d="M0 24 L24 0" fill="none" stroke="var(--text-tertiary)" strokeWidth="0.4" />
        </pattern>
        <linearGradient id="causal-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="white" stopOpacity="1" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="lower-tri-mask">
          <polygon points="0,0 0,600 600,600" fill="url(#causal-fade)" />
        </mask>
      </defs>
      <g opacity="0.06" mask="url(#lower-tri-mask)">
        <rect width="100%" height="100%" fill="url(#causal-tri-grid)" />
      </g>
    </svg>
  );
}
