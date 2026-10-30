import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useStore } from '../app/store'

export function Toast() {
  const toast = useStore((s) => s.toast)
  const dismiss = useStore((s) => s.dismissToast)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(dismiss, 4200)
    return () => window.clearTimeout(timer)
  }, [toast, dismiss])

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          className={`toast ${toast.tone === 'error' ? 'error' : ''}`}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.16 }}
        >
          <i className="toast-dot" />
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
