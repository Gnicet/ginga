import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import './dialogs.css'

interface DialogProps {
  title: string
  onClose: () => void
  children: ReactNode
  kind?: 'story' | 'comments' | 'create'
}

export function Dialog({ title, onClose, children, kind }: DialogProps) {
  const titleId = useId()
  const panel = useRef<HTMLElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); return }
      if (event.key !== 'Tab' || !panel.current) return
      const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea, select, [tabindex="0"]')).filter(el => el.offsetParent !== null)
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
        event.preventDefault(); last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = overflow
      previous?.focus({ preventScroll: true })
    }
  }, [])
  return createPortal(<div className="ginga-dialog-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section className={'ginga-dialog ginga-dialog-' + kind} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panel} tabIndex={-1}>
      {kind === 'story' ? <h2 className="gd-sr" id={titleId}>{title}</h2> : <header className="gd-head">
        <h2 id={titleId}>{title}</h2><button type="button" className="gd-icon" aria-label="Fechar" onClick={onClose}><X size={20}/></button>
      </header>}
      {children}
    </section>
  </div>, document.body)
}
