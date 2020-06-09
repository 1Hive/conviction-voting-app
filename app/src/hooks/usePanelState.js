import { useCallback, useMemo, useState } from 'react'

// Handles the state of a panel.
// Pass `onTransitionEnd` to the same SidePanel prop.
export default function usePanelState() {
  const [visible, setVisible] = useState(false)

  // `didOpen` is set to `true` when the opening transition of the panel has
  // ended, `false` otherwise. This is useful to know when to start inner
  // transitions in the panel content.
  const [didOpen, setDidOpen] = useState(false)

  const requestOpen = useCallback(() => {
    setVisible(true)
    setDidOpen(false)
  }, [setVisible, setDidOpen])

  const requestClose = useCallback(() => {
    setVisible(false)
  }, [setVisible])

  return useMemo(() => ({ requestOpen, requestClose, visible, didOpen }), [
    requestOpen,
    requestClose,
    visible,
    didOpen,
  ])
}
