/** Original top-down single-seater — chalk-line engineering-drawing style (no team IP). */
export function SingleSeater({
  width = 340,
  accent = 'var(--gt-signal)',
  stroke = 'var(--gt-data-chalk)',
}: {
  width?: number
  accent?: string
  stroke?: string
}) {
  return (
    <svg
      viewBox="0 0 340 150"
      width={width}
      height={(width / 340) * 150}
      role="img"
      aria-label="Top-down technical drawing of a Formula 1 single-seater"
      style={{ display: 'block' }}
    >
      <g fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
        {/* nose + front wing */}
        <path d="M18 96 L64 88 L74 74 L96 70 L120 70" />
        <path d="M18 96 L64 104 L74 118 L96 122 L120 122" />
        <path d="M14 78 L14 114 M8 82 L8 110" strokeWidth="1.2" />
        {/* front wheels */}
        <rect x="96" y="44" width="34" height="26" rx="5" />
        <rect x="96" y="120" width="34" height="26" rx="5" />
        {/* chassis / sidepods */}
        <path d="M120 70 L150 62 L196 58 L232 64 L248 72 L248 120 L232 128 L196 134 L150 130 L120 122" />
        <path d="M150 62 L158 96 L150 130" strokeWidth="1" opacity="0.55" />
        <path d="M196 58 L200 96 L196 134" strokeWidth="1" opacity="0.55" />
        {/* halo + cockpit */}
        <ellipse cx="172" cy="96" rx="22" ry="16" strokeWidth="1.4" />
        <path d="M162 84 Q172 76 182 84" strokeWidth="1.4" />
        {/* airbox / engine cover */}
        <path d="M232 64 L268 78 L292 88 L292 104 L268 114 L232 128" />
        <path d="M248 72 L262 96 L248 120" strokeWidth="1" opacity="0.55" />
        {/* rear wheels */}
        <rect x="262" y="40" width="40" height="30" rx="5" />
        <rect x="262" y="122" width="40" height="30" rx="5" />
        {/* rear wing */}
        <path d="M300 62 L326 58 L326 134 L300 130" />
        <path d="M308 70 L320 68 M308 96 L320 96 M308 122 L320 124" strokeWidth="1.1" />
        {/* centreline + dimension ticks (engineering-drawing accent) */}
        <path d="M40 96 L300 96" strokeWidth="0.8" strokeDasharray="3 5" opacity="0.4" />
      </g>
      {/* signal accent: racing-line entry arrow through the nose */}
      <path
        d="M2 96 L18 96"
        stroke={accent}
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="172" cy="96" r="3" fill={accent} />
    </svg>
  )
}
