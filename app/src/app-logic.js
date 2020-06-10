import { useCallback, useMemo, useState } from 'react'
import { useAragonApi, useAppState } from '@aragon/api-react'

import { formatTokenAmount } from './lib/token-utils'
import { toHex } from 'web3-utils'

// Handles the main logic of the app.
export default function useAppLogic() {
  const { api, connectedAccount } = useAragonApi()
  const { proposals = [], stakeToken, convictionStakes } = useAppState()

  const [proposalPanel, setProposalPanel] = useState(false)

  const onProposalSubmit = useCallback((title, link, amount, beneficiary) => {
    api.addProposal(title, toHex(link), amount, beneficiary).toPromise()
    setProposalPanel(false)
  }, [])

  const myStakesHistory =
    (convictionStakes &&
      convictionStakes.filter(({ entity }) => entity === connectedAccount)) ||
    []

  const myCurrentStakes = useMemo(() => {
    return myStakesHistory.reduce(
      (stakes, { proposal: currProposalId, tokensStaked }) => {
        if (tokensStaked === 0) stakes.delete(currProposalId)
        else {
          const proposal = proposals.find(({ id }) => id === currProposalId)
          if (proposal && !proposal.executed) {
            stakes.set(
              currProposalId,
              formatTokenAmount(
                parseInt(tokensStaked),
                parseInt(stakeToken.tokenDecimals)
              )
            )
          }
        }
        return stakes
      },
      new Map()
    )
  }, [myStakesHistory.length])
  const myLastStake = [...myStakesHistory].pop() || []

  return {
    onProposalSubmit,
    proposalPanel,
    setProposalPanel,
    myLastStake,
    myStakes: myCurrentStakes,
  }
}
