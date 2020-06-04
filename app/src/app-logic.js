import { useState, useMemo } from 'react'
import BN from 'bn.js'
import { useAragonApi, useAppState } from '@aragon/api-react'
import { toDecimals } from './lib/math-utils'
import { toHex } from 'web3-utils'

// Handles the main logic of the app.
export default function useAppLogic() {
  const { api, connectedAccount } = useAragonApi()
  const {
    proposals = [],
    stakeToken,
    requestToken,
    convictionStakes,
  } = useAppState()

  const [proposalPanel, setProposalPanel] = useState(false)
  const [myActiveTokens, setMyActiveTokens] = useState(new BN('0'))
  const [totalActiveTokens, setTotalActiveTokens] = useState(new BN('0'))

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

  const myActiveStakes = useMemo(() => {
    if (!connectedAccount || !stakeToken.tokenDecimals || !proposals) {
      return
    }
    return proposals.reduce((myStakes, proposal) => {
      if (proposal.executed || !proposal.stakes) {
        return myStakes
      }

      const totalActive = proposal.stakes.reduce((accumulator, stake) => {
        return accumulator.add(stake.amount)
      }, new BN('0'))

      setTotalActiveTokens(prevValue => prevValue.add(totalActive))

      const myStake = proposal.stakes.find(
        stake => stake.entity === connectedAccount
      )
      if (!myStake) {
        return myStakes
      }

      myStakes.push({
        proposal: proposal.id,
        proposalName: proposal.name,
        stakedAmount: myStake.amount,
      })
      setMyActiveTokens(prevValue => prevValue.add(myStake.amount))
      return myStakes
    }, [])
  }, [proposals.length, connectedAccount, stakeToken.tokenDecimals])

  const myLastStake = [...myStakesHistory].pop() || []

  return {
    onProposalSubmit,
    proposalPanel,
    setProposalPanel,
    myLastStake,
    myStakes: myActiveStakes,
    myActiveTokens,
    totalActiveTokens,
  }
}
