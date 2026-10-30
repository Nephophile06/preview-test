const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function PlayIcon({ size = 18 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function PauseIcon({ size = 18 }) {
  return (
    <svg {...base} width={size} height={size}>
      <rect x="7" y="5" width="3.2" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.8" y="5" width="3.2" height="14" rx="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function PrevIcon() {
  return (
    <svg {...base}>
      <path d="M6 5v14M18 6.5 9.5 12l8.5 5.5z" />
    </svg>
  )
}

export function NextIcon() {
  return (
    <svg {...base}>
      <path d="M18 5v14M6 6.5 14.5 12 6 17.5z" />
    </svg>
  )
}

export function VolumeIcon({ muted = false, size = 18 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M4 9.5h3.2L12 5.8v12.4l-4.8-3.7H4z" />
      {muted ? (
        <path d="m16 9 5 5m0-5-5 5" />
      ) : (
        <>
          <path d="M15.3 9.2a4 4 0 0 1 0 5.6" />
          <path d="M18 6.8a7.4 7.4 0 0 1 0 10.4" opacity=".6" />
        </>
      )}
    </svg>
  )
}

export function HelpIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.8 9.3a2.4 2.4 0 1 1 3.4 2.2c-.9.4-1.2 1-1.2 1.9" />
      <circle cx="12" cy="16.7" r=".8" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SettingsIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="2.7" />
      <path d="M12 3.6v2.2M12 18.2v2.2M3.6 12h2.2M18.2 12h2.2M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6" />
    </svg>
  )
}

export function CloseIcon({ size = 18 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

export function StoryIcon() {
  return (
    <svg {...base}>
      <path d="M4.8 5.5h6.4a2 2 0 0 1 2 2v11a2 2 0 0 0-2-2H4.8z" />
      <path d="M19.2 5.5h-4a2 2 0 0 0-2 2v11a2 2 0 0 1 2-2h4z" />
    </svg>
  )
}

export function ExploreIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="6.8" />
      <path d="m15.2 8.8-1.8 4.6-4.6 1.8 1.8-4.6z" />
      <path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1" opacity=".55" />
    </svg>
  )
}

export function ShareIcon() {
  return (
    <svg {...base}>
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <circle cx="18" cy="18" r="2.2" />
      <path d="m8 11 7.8-4M8 13l7.8 4" />
    </svg>
  )
}

export function DownloadIcon() {
  return (
    <svg {...base}>
      <path d="M12 3.5v11M7.8 10.5 12 14.7l4.2-4.2" />
      <path d="M4.5 17.2v1.7a1.6 1.6 0 0 0 1.6 1.6h11.8a1.6 1.6 0 0 0 1.6-1.6v-1.7" />
    </svg>
  )
}

export function MenuIcon() {
  return (
    <svg {...base}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function ChevronIcon({ dir = 'down' }) {
  const rotate = { down: 0, up: 180, right: -90, left: 90 }[dir]
  return (
    <svg {...base} style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function SparkIcon({ size = 18 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M12 3.8c.6 4.2 2 5.6 6.2 6.2-4.2.6-5.6 2-6.2 6.2-.6-4.2-2-5.6-6.2-6.2 4.2-.6 5.6-2 6.2-6.2Z" />
      <path d="M18.5 15.5c.25 1.55.75 2.05 2.3 2.3-1.55.25-2.05.75-2.3 2.3-.25-1.55-.75-2.05-2.3-2.3 1.55-.25 2.05-.75 2.3-2.3Z" opacity=".6" />
    </svg>
  )
}

export function KeyboardIcon() {
  return (
    <svg {...base}>
      <rect x="2.8" y="6.5" width="18.4" height="11" rx="2" />
      <path d="M6.5 10h.1M9.8 10h.1M13.2 10h.1M16.5 10h.1M6.5 13h.1M16.5 13h.1M9 15.5h6" />
    </svg>
  )
}

export function ContrastIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17a8.5 8.5 0 0 0 0-17Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function MotionIcon() {
  return (
    <svg {...base}>
      <path d="M4 16.5c4.6 0 5.4-9 10.2-9 2 0 3.2 1.2 5.8 1.2" />
      <path d="M4 12h4.5M11 7.5h4" opacity=".55" />
    </svg>
  )
}
