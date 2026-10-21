import ScrollVelocity from '../reactbits/ScrollVelocity/ScrollVelocity'

export function Marquee() {
  return (
    <div className="manifesto__band marquee" aria-hidden="true">
      <ScrollVelocity
        texts={['Every gap tells a story', 'Read the race']}
        velocity={60}
        className="manifesto__marquee"
        separator={<span className="manifesto__sep">✦</span>}
        skewWithVelocity={6}
      />
    </div>
  )
}
