import './App.css'
import Leaderboard from './components/Leaderboard.jsx'
import InfoPopover from './components/InfoPopover.jsx'

function App() {
  return (
    <main>
      <header>
        <div className="header-title">
          <img src="/icon.png" alt="SlopBench icon" className="header-icon" />
          <h1>SlopBench</h1>
        </div>
        <p className="subtitle">Slop so hard mfs tryna find me.</p>
      </header>
      <Leaderboard />
      <footer>
        <div className="footer-links">
          <a href="https://github.com/Dan-Cleary/slopbench" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" className="footer-icon" aria-hidden="true">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c.002 0 .004-.001.006-.001.998.006 2.003.138 2.997.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </a>
          <span className="footer-sep">·</span>
          <span>Created by</span>
          <a href="https://twitter.com/DanJCleary" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" className="footer-icon" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.258 5.629L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
            </svg>
            @DanJCleary
          </a>
        </div>
      </footer>
    </main>
  )
}

export default App
