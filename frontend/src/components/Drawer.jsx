import { useEffect, useId, useRef } from 'react'
import { motion } from 'motion/react'
import { CloseIcon } from './Icons'

export function Drawer({ title, eyebrow, onClose, children }) {
  const ref = useRef(null)
  const titleId = useId()
  const returnFocus = useRef(null)

  useEffect(() => {
    returnFocus.current = document.activeElement
    const node = ref.current
    const focusable = node?.querySelector('[data-autofocus]') || node?.querySelector('button, select, input, [tabindex]')
    focusable?.focus?.()
    return () => {
      returnFocus.current?.focus?.()
    }
  }, [])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !ref.current) return
      const nodes = [...ref.current.querySelectorAll('button:not([disabled]), select, input, a[href], [tabindex]:not([tabindex="-1"])')].filter(
        (el) => el.offsetParent !== null,
      )
      if (!nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <motion.div
        ref={ref}
        className="drawer glass-strong"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18 }}
      >
        <div className="drawer-head">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2 id={titleId} className="drawer-title">{title}</h2>
          </div>
          <button className="icon-btn" data-autofocus aria-label="Close panel" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        {children}
      </motion.div>
    </>
  )
}
