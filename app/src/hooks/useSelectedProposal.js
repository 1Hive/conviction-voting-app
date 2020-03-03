import { useCallback, useMemo } from 'react'
import { useAppState, usePath } from '@aragon/api-react'

const PROPOSAL_ID_PATH_RE = /^\/proposal\/([0-9]+)\/?$/
const NO_PROPOSAL_ID = '-1'

function idFromPath(path) {
  if (!path) {
    return NO_PROPOSAL_ID
  }
  const matches = path.match(PROPOSAL_ID_PATH_RE)
  return matches ? matches[1] : NO_PROPOSAL_ID
}

// Get the proposal currently selected, or null otherwise.
export default function useSelectedProposal(proposals) {
  const [path, requestPath] = usePath()
  const { isSyncing } = useAppState()

  // The memoized proposal currently selected.
  const selectedProposal = useMemo(() => {
    const id = idFromPath(path)

    // The `isSyncing` check prevents a proposal to be
    // selected until the app state is fully ready.
    if (isSyncing || id === NO_PROPOSAL_ID) {
      return null
    }

    return (
      proposals.find(proposal => Number(proposal.id) === Number(id)) || null
    )
  }, [path, isSyncing, proposals])

  const selectProposal = useCallback(
    id => {
      requestPath(String(id) === NO_PROPOSAL_ID ? '' : `/proposal/${id}/`)
    },
    [requestPath]
  )

  return [selectedProposal, selectProposal]
}
