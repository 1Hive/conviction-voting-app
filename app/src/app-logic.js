import { useState } from 'react'
import { useAragonApi, useAppState } from '@aragon/api-react'
// import usePanelState from './hooks/usePanelState'
// import { noop } from './utils'
import { toDecimals } from './lib/math-utils'
import { toHex } from 'web3-utils'

// // Create a new proposal
// export function useCreateProposalAction(onDone = noop) {
//   const api = useApi()
//   return useCallback(
//     title => {
//       if (api) {
//         // Don't care about response
//         api['newProposal(string)'](title).toPromise()
//         onDone()
//       }
//     },
//     [api, onDone]
//   )
// }

// Handles the main logic of the app.
export default function useAppLogic() {
  const { api, connectedAccount } = useAragonApi()
  const { requestToken, convictionStakes } = useAppState()

  const [proposalPanel, setProposalPanel] = useState(false)

  const onProposalSubmit = ({
    title,
    link,
    amount,
    beneficiary,
    description,
  }) => {
    const decimals = parseInt(requestToken.decimals)
    const decimalAmount = toDecimals(amount.trim(), decimals).toString()
    api
      .addProposal(title, toHex(link), decimalAmount, beneficiary, description)
      .toPromise()
    setProposalPanel(false)
  }

  const myStakes =
    (convictionStakes &&
      convictionStakes.filter(({ entity }) => entity === connectedAccount)) ||
    []

  const myLastStake = [...myStakes].pop() || []
  // const newProposalPanel = usePanelState()

  // const actions = {
  //   createProposal: useCreateProposalAction(newProposalPanel.requestClose),
  // }

  return {
    // actions,
    // newProposalPanel,
    onProposalSubmit,
    proposalPanel,
    setProposalPanel,
    myLastStake,
  }
}
