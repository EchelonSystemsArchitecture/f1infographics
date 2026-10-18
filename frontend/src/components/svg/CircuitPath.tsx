/**
 * Original stylized circuit (not a licensed track outline) with a chalk base line
 * and a signal-red racing line drawn along it.
 */
export function CircuitPath({
  width = 520,
  progress = 1,
}: {
  width?: number
  /** 0..1 — how much of the racing line is drawn */
  progress?: number
}) {
  const d =
    'M60 190 C60 120 90 70 150 58 C210 46 250 90 300 96 C350 102 380 70 420 82 ' +
    'C470 97 480 150 450 185 C420 220 360 210 310 226 C260 242 230 280 170 272 ' +
    'C110 264 60 250 60 190 Z'
  // approximate path length for dash animation (generous upper bound)
  const LEN = 1400
  return (
    <svg
      viewBox="0 0 520 320"
      width={width}
      height={(width / 520) * 320}
      role="img"
      aria-label="Stylized circuit map with racing line"
      style={{ display: 'block' }}
    >
      {/* faint grid paper */}
      <g stroke="var(--gt-grid-line)" strokeWidth="0.6" opacity="0.7">
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={40 * (i + 1)} x2="520" y2={40 * (i + 1)} />
        ))}
        {Array.from({ length: 13 }, (_, i) => (
          <line key={`v${i}`} x1={40 * (i + 1)} y1="0" x2={40 * (i + 1)} y2="320" />
        ))}
      </g>
      {/* chalk base line */}
      <path
        d={d}
        fill="none"
        stroke="var(--gt-data-chalk)"
        strokeOpacity="0.35"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d={d}
        fill="none"
        stroke="var(--gt-data-chalk)"
        strokeOpacity="0.9"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* signal racing line, dash-drawn by progress */}
      <path
        d={d}
        fill="none"
        stroke="var(--gt-signal)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray={LEN}
        strokeDashoffset={LEN * (1 - progress)}
        style={{ transition: 'stroke-dashoffset 280ms cubic-bezier(0.2,0.8,0.2,1)' }}
      />
      {/* start/finish tick */}
      <line x1="52" y1="176" x2="68" y2="204" stroke="var(--gt-text-primary)" strokeWidth="2" />
    </svg>
  )
}
