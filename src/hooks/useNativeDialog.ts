import { useEffect, useRef } from 'react'

export function useNativeDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex="0"]',
        ),
      )
      const first = controls[0]
      const last = controls.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    dialog.addEventListener('keydown', trapFocus)
    return () => {
      dialog.removeEventListener('keydown', trapFocus)
      if (dialog.open) dialog.close()
      document.body.style.overflow = previousOverflow
      if (focused?.isConnected) focused.focus({ preventScroll: true })
    }
  }, [open])
  return ref
}
