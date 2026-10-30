import { useEffect, useRef, useState } from 'react'
import { useStore } from '../app/store'
import { TRACKS } from '../data/tracks'
import { CloseIcon, ExploreIcon, HelpIcon, MenuIcon, SettingsIcon, StoryIcon } from './Icons'

function EarthMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="11.2" stroke="currentColor" strokeWidth=".9" opacity=".55" />
      <ellipse cx="16" cy="16" rx="5.1" ry="11.1" stroke="currentColor" strokeWidth=".75" opacity=".4" />
      <path d="M5 12.6h22M5 19.4h22" stroke="currentColor" strokeWidth=".7" opacity=".28" />
      <path d="M16 4.8c3.7 2.6 5.7 6.4 5.7 11.2S19.7 24.6 16 27.2c-3.7-2.6-5.7-6.4-5.7-11.2S12.3 7.4 16 4.8Z" stroke="currentColor" strokeWidth=".75" opacity=".38" />
      <circle cx="16" cy="16" r="3.1" fill="currentColor" opacity=".94" />
      <circle cx="16" cy="16" r="5.8" stroke="currentColor" strokeWidth=".7" opacity=".35" />
      <path d="M24.8 9.2c-1.7.9-2.8 1.5-4.5 1.6" stroke="currentColor" strokeWidth=".8" opacity=".5" />
    </svg>
  )
}

function CacheBadge() {
  const dataMode = useStore((s) => s.dataMode)
  if (dataMode === 'checking') return null
  return (
    <span className={`cache-badge ${dataMode}`} title={dataMode === 'cache' ? 'NASA cache fallback is in use.' : 'Connected to local NASA data service.'}>
      <i className="cache-dot" />
      {dataMode === 'cache' ? 'Cached NASA' : 'Live NASA'}
    </span>
  )
}

function MobileMenu({ onStory, onExplore }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const explore = useStore((s) => s.explore)
  const probe = useStore((s) => s.probe)
  const openPanel = useStore((s) => s.openPanel)
  const setProbeOpen = useStore((s) => s.setProbeOpen)

  useEffect(() => {
    if (!open) return
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="icon-btn mobile-only"
        aria-label="Open menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>
      {open && (
        <div
          role="menu"
          className="glass-strong"
          style={{ position: 'absolute', right: 0, top: 46, width: 184, padding: 5, zIndex: 45 }}
        >
          {[
            ['Story mode', StoryIcon, () => { setOpen(false); onStory() }],
            ['Explore with cursor', ExploreIcon, () => { setOpen(false); onExplore() }, explore],
            ['Listening probe', null, () => { setOpen(false); setProbeOpen(true) }, probe.open],
            ['How to use', HelpIcon, () => { setOpen(false); openPanel('help') }],
            ['Settings', SettingsIcon, () => { setOpen(false); openPanel('settings') }],
          ].map(([label, Icon, action, active]) => (
            <button
              key={label}
              role="menuitem"
              aria-pressed={active == null ? undefined : Boolean(active)}
              onClick={action}
              style={{
                width: '100%',
                height: 40,
                border: 0,
                borderRadius: 5,
                background: active ? 'var(--accent-soft)' : 'transparent',
                color: active ? 'var(--cream)' : 'var(--cream-70)',
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '0 9px',
                fontSize: 10.5,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              {Icon ? <Icon /> : <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid currentColor', display: 'inline-block' }} />}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function TopBar({ onStory, onExplore }) {
  const trackId = useStore((s) => s.trackId)
  const setTrack = useStore((s) => s.setTrack)
  const explore = useStore((s) => s.explore)
  const openPanel = useStore((s) => s.openPanel)
  const panels = useStore((s) => s.panels)

  const chooseTrack = (next) => {
    if (next.id === trackId) return
    setTrack(next.id)
  }

  return (
    <header className="topbar glass" aria-label="Earth Jukebox controls">
      <a href="#main-map" className="brand" aria-label="Earth Jukebox — skip to map">
        <EarthMark />
        <span className="brand-copy">
          <span className="brand-title">Earth Jukebox</span>
          <span className="brand-sub">NASA Earth, in sound</span>
        </span>
      </a>

      <nav className="track-nav" aria-label="Choose a NASA data track">
        {TRACKS.map((item) => (
          <button
            key={item.id}
            className="track-pill"
            style={{ '--accent': item.accent, '--accent-soft': item.accentSoft }}
            aria-pressed={item.id === trackId}
            aria-label={`${item.title} track: ${item.line}`}
            onClick={() => chooseTrack(item)}
          >
            <i className="track-dot" />
            <span className="pill-long">{item.title}</span>
            <span className="pill-short">{item.shortTitle}</span>
          </button>
        ))}
      </nav>

      <div className="top-actions">
        <CacheBadge />
        <button
          className="icon-btn desktop-action"
          aria-label="Explore mode — sonify places as you move across the map"
          aria-pressed={explore}
          data-tip="Explore · E"
          onClick={onExplore}
        >
          <ExploreIcon />
        </button>
        <button className="icon-btn desktop-action" data-tip="Guided story · S" aria-label="Start a guided listening story" onClick={onStory}>
          <StoryIcon />
        </button>
        <button
          className="icon-btn desktop-action"
          data-tip="How to use · ?"
          aria-label="Open help and how to use"
          aria-expanded={panels.help}
          onClick={() => openPanel(panels.help ? null : 'help')}
        >
          <HelpIcon />
        </button>
        <button
          className="icon-btn desktop-action"
          data-tip="Settings"
          aria-label="Open settings"
          aria-expanded={panels.settings}
          onClick={() => openPanel(panels.settings ? null : 'settings')}
        >
          <SettingsIcon />
        </button>
        <MobileMenu onStory={onStory} onExplore={onExplore} />
      </div>
    </header>
  )
}
