import { useSearchParams } from 'react-router-dom'
import Ferrofluid from '../../components/reactbits/Ferrofluid/Ferrofluid'

export function FerroLab() {
  const [p] = useSearchParams()
  return (
    <div style={{ height: '100svh', background: '#000' }}>
      <Ferrofluid
        colors={p.has('c') ? ['#ff8000', '#3fc5ff', '#ffffff'] : undefined}
        transparent={!p.has('opaque')}
        color={p.has('opaque') ? '#0c0b0a' : undefined}
        paused={p.has('paused')}
      />
    </div>
  )
}
