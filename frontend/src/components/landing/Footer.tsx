import { Link } from 'react-router-dom'
import Magnet from '../reactbits/Magnet/Magnet'
import { useTeam } from '../../theme/useTeam'
import { scrollToTarget } from '../../hooks/useSmoothScroll'
import { Topo } from './Topo'
import { Mark } from './Mark'

export function Footer() {
  const { team } = useTeam()
  return (
    <footer id="finish" className="footer">
      <p className="footer__pre">The race is still telling its story.</p>
      <div className="footer__card">
        <Topo seed={9} color="var(--team-primary)" opacity={0.16} />
        <div className="footer__notch" aria-hidden="true" />
        <h2 className="footer__title">
          <span>Always chasing</span>
          <em>the gap.</em>
        </h2>
        <Magnet padding={40} magnetStrength={5} maxOffset={8}>
          <Link to="/app" className="btn btn--primary btn--lg">
            Enter the pitwall
          </Link>
        </Magnet>

        <div className="footer__cols">
          <div>
            <p className="footer__k mono">PAGES</p>
            <button type="button" onClick={() => scrollToTarget(0)}>Home</button>
            <Link to="/app">Race Control</Link>
            <Link to="/app/battle">Battle Lab</Link>
          </div>
          <div>
            <p className="footer__k mono">DATA</p>
            <a href="https://openf1.org" target="_blank" rel="noreferrer">OpenF1</a>
            <a href="https://github.com/jolpica/jolpica-f1" target="_blank" rel="noreferrer">Jolpica</a>
            <a href="https://multiviewer.app" target="_blank" rel="noreferrer">MultiViewer</a>
          </div>
          <div>
            <p className="footer__k mono">THEME</p>
            <span className="footer__theme">
              <i style={{ background: team.colors.primary }} />
              {team.label}
            </span>
            <span className="footer__small">More teams coming as themes.</span>
          </div>
        </div>
      </div>
      <div className="footer__bar">
        <span className="footer__brand">
          <Mark size={18} /> GridTrace
        </span>
        <p className="footer__legal">
          Independent fan-built analysis project. Not affiliated with, endorsed by or connected to Formula 1, the FIA
          or any team. Team colours are used as descriptive themes only; F1 and related marks belong to their owners.
          All race data is historical replay.
          <br />
          3D car based on{" "}
          <a href="https://sketchfab.com/3d-models/ferrari-f1-75-06454e0f23a44fcdabcc7808aee6caf9" target="_blank" rel="noreferrer">
            “Ferrari F1-75”
          </a>{" "}
          by{" "}
          <a href="https://sketchfab.com/sketcher987654321" target="_blank" rel="noreferrer">
            Sketcher
          </a>
          , licensed{" "}
          <a href="http://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noreferrer">
            CC BY-NC 4.0
          </a>
          ; repainted, decals removed and compressed.
        </p>
      </div>
    </footer>
  )
}
