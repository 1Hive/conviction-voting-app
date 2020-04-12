import { useState, useMemo } from 'react'
import { useAragonApi, useAppState } from '@aragon/api-react'
import { toDecimals } from './lib/math-utils'
import { formatTokenAmount } from './lib/token-utils'
import { toHex } from 'web3-utils'

// Handles the main logic of the app.
export default function useAppLogic() {
  const { api, connectedAccount } = useAragonApi()
  const { proposals = [], requestToken, convictionStakes } = useAppState()

  const [proposalPanel, setProposalPanel] = useState(false)

  const onProposalSubmit = ({ title, link, amount, beneficiary }) => {
    const decimals = parseInt(requestToken.decimals)
    const decimalAmount = toDecimals(amount.trim(), decimals).toString()
    api.addProposal(title, toHex(link), decimalAmount, beneficiary).toPromise()
    setProposalPanel(false)
  }

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
          if (proposal && !proposal.executed)
            stakes.set(
              currProposalId,
              formatTokenAmount(tokensStaked, parseInt(requestToken.decimals))
            )
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
