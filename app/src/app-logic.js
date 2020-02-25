import { useCallback, useMemo } from 'react'
import { useApi, useAppState, usePath } from '@aragon/api-react'
// import usePanelState from './hooks/usePanelState'
import { noop } from './utils'

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
export function useSelectedProposal(proposals) {
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

// Create a new proposal
export function useCreateProposalAction(onDone = noop) {
  const api = useApi()
  return useCallback(
    title => {
      if (api) {
        // Don't care about response
        api['newProposal(string)'](title).toPromise()
        onDone()
      }
    },
    [api, onDone]
  )
}

// Handles the main logic of the app.
export default function useAppLogic() {
  const { isSyncing, proposals = [] } = useAppState()

  const [selectedProposal, selectProposal] = useSelectedProposal(proposals)
  // const newProposalPanel = usePanelState()

  // const actions = {
  //   createProposal: useCreateProposalAction(newProposalPanel.requestClose),
  // }

  return {
    // actions,
    isSyncing,
    // newProposalPanel,
    selectProposal,
    selectedProposal,
    proposals,
  }
}
