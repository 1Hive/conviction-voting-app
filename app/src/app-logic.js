import { useState } from 'react'
import { useAragonApi, useAppState } from '@aragon/api-react'
import { toDecimals } from './lib/math-utils'
import { toHex } from 'web3-utils'

// Handles the main logic of the app.
export default function useAppLogic() {
  const { api, connectedAccount } = useAragonApi()
  const { requestToken, convictionStakes } = useAppState()

  const [proposalPanel, setProposalPanel] = useState(false)

  const onProposalSubmit = ({ title, link, amount, beneficiary }) => {
    const decimals = parseInt(requestToken.decimals)
    const decimalAmount = toDecimals(amount.trim(), decimals).toString()
    api.addProposal(title, toHex(link), decimalAmount, beneficiary).toPromise()
    setProposalPanel(false)
  }

  const myStakes =
    (convictionStakes &&
      convictionStakes.filter(({ entity }) => entity === connectedAccount)) ||
    []

  const myLastStake = [...myStakes].pop() || []

  return {
    onProposalSubmit,
    proposalPanel,
    setProposalPanel,
    myLastStake,
  }
}
