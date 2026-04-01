import { useState, useEffect, useRef } from 'react'

const GITHUB_URL = 'https://github.com/Dan-Cleary/slopbench'

export default function InfoPopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="info-wrap" ref={ref}>
      <button className="info-btn" onClick={() => setOpen(v => !v)} aria-label="Methodology">
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="7" />
          <line x1="8" y1="7" x2="8" y2="11" />
          <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {open && (
        <div className="info-popover">
          <p>Share of responses containing sycophantic openers (e.g. "You're absolutely right"), classic AI phrases, hedge phrases, reframes, or validation.</p>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="info-link">
            View on GitHub →
          </a>
        </div>
      )}
    </div>
  )
}
