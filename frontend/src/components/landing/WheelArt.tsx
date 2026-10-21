import type { Ref } from 'react'

const HOLES = Array.from({ length: 18 }, (_, i) => (i / 18) * Math.PI * 2)
const SPOKES = Array.from({ length: 5 }, (_, i) => i * 72)
const TREAD_TICKS = Array.from({ length: 36 }, (_, i) => i * 10)

export function WheelArt({ spinA, spinB }: { spinA: Ref<SVGGElement>; spinB: Ref<SVGGElement> }) {
  return (
    <>
      <defs>
        <radialGradient id="wa-rubber" cx="50%" cy="50%" r="50%">
          <stop offset="66%" stopColor="#1b1b1c" />
          <stop offset="82%" stopColor="#262628" />
          <stop offset="94%" stopColor="#161617" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </radialGradient>
        <radialGradient id="wa-disc" cx="50%" cy="50%" r="50%">
          <stop offset="40%" stopColor="#2a2421" />
          <stop offset="85%" stopColor="#3b2b22" />
          <stop offset="100%" stopColor="#7a3a12" />
        </radialGradient>
        <linearGradient id="wa-spoke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5d6067" />
          <stop offset="100%" stopColor="#2c2e33" />
        </linearGradient>
        <path id="wa-text" d="M60 60 m-35.2 0 a35.2 35.2 0 1 1 70.4 0 a35.2 35.2 0 1 1 -70.4 0" />
      </defs>

      <circle cx="60" cy="61.5" r="41" fill="#000" opacity="0.35" />

      <g ref={spinA} className="tyreprog__wheel">
        <circle cx="60" cy="60" r="41" fill="url(#wa-rubber)" stroke="#000" strokeWidth="2" />
        {TREAD_TICKS.map((a) => (
          <line key={a} x1="60" y1="19.6" x2="60" y2="21.4" stroke="#000" strokeWidth="0.8" transform={`rotate(${a} 60 60)`} />
        ))}
        <circle cx="60" cy="60" r="38.6" fill="none" stroke="#000" strokeOpacity="0.55" strokeWidth="0.6" />
        <text className="tyreprog__sidewall">
          <textPath href="#wa-text" startOffset="0">
            GRIDTRACE · SLICK · DRY · GRIDTRACE · SLICK · DRY ·
          </textPath>
        </text>
        <circle cx="60" cy="60" r="30.6" fill="none" stroke="var(--team-primary)" strokeWidth="2.6" strokeDasharray="44 4" />
        <circle cx="60" cy="60" r="32.4" fill="none" stroke="var(--team-primary)" strokeWidth="0.5" opacity="0.7" />
        <circle cx="60" cy="60" r="27.2" fill="#1d1e21" stroke="#000" strokeWidth="1.4" />
        <circle cx="60" cy="60" r="21.5" fill="url(#wa-disc)" stroke="#000" strokeWidth="0.8" />
        <circle cx="60" cy="60" r="20.6" fill="none" stroke="#ff7a1a" strokeWidth="0.9" opacity="0.45" />
        {HOLES.map((a, i) => (
          <circle key={i} cx={60 + Math.cos(a) * 17.2} cy={60 + Math.sin(a) * 17.2} r="0.75" fill="#0b0b0b" />
        ))}
      </g>

      <path d="M41.5 44 q4-7.5 11-10.6 l2.6 5 q-5.4 2.6-8.4 8 z" fill="var(--team-secondary)" stroke="#000" strokeWidth="1.1" strokeLinejoin="round" />
      <rect x="45.2" y="39.6" width="3.2" height="1.6" rx="0.6" fill="#0d0d0d" transform="rotate(-48 46.8 40.4)" />

      <g ref={spinB} className="tyreprog__wheel">
        {SPOKES.map((a) => (
          <g key={a} transform={`rotate(${a} 60 60)`}>
            <path
              d="M57.8 52.5 L53.6 34.6 Q55.4 33.4 57.2 34.2 L60 50.6 L62.8 34.2 Q64.6 33.4 66.4 34.6 L62.2 52.5 Z"
              fill="url(#wa-spoke)"
              stroke="#000"
              strokeWidth="0.9"
              strokeLinejoin="round"
            />
            <path d="M58.7 51 L55.3 35.2" stroke="#8b8e95" strokeWidth="0.45" strokeLinecap="round" />
            <circle cx="60" cy="34.4" r="0.9" fill="#9a9da3" stroke="#000" strokeWidth="0.3" />
          </g>
        ))}
        <circle cx="60" cy="60" r="9.4" fill="#26282c" stroke="#000" strokeWidth="1.1" />
        <polygon
          points="60,53.4 65.7,56.7 65.7,63.3 60,66.6 54.3,63.3 54.3,56.7"
          fill="var(--team-primary)"
          stroke="#000"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <circle cx="60" cy="60" r="3.2" fill="#121212" stroke="#000" strokeWidth="0.6" />
        <rect x="59.4" y="52.2" width="1.2" height="2.4" rx="0.5" fill="#d9d9d9" />
        <rect x="59.2" y="31.4" width="1.6" height="3.2" rx="0.6" fill="#c9c9c9" stroke="#000" strokeWidth="0.4" />
      </g>

      <path d="M24.4 46 A38 38 0 0 1 46 21.6" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M28.6 40.4 A33 33 0 0 1 36 30.6" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="51" cy="53" r="1.3" fill="#fff" opacity="0.5" />
    </>
  )
}
