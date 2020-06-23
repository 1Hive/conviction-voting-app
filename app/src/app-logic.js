import { useState, useMemo } from 'react'
import BigNumber from './lib/bigNumber'
import { useAragonApi, useAppState } from '@aragon/api-react'
import { toDecimals } from './lib/math-utils'
import { toHex } from 'web3-utils'
import { useProposals } from './hooks/useProposals'

// Handles the main logic of the app.
export default function useAppLogic() {
  const { api, connectedAccount } = useAragonApi()
  const { stakeToken, requestToken, isSyncing } = useAppState()
  const [proposals, blockHasLoaded] = useProposals()

  const [proposalPanel, setProposalPanel] = useState(false)

  const onProposalSubmit = ({ title, link, amount, beneficiary }) => {
    const decimals = parseInt(requestToken.decimals)
    const decimalAmount = toDecimals(amount.trim(), decimals).toString()
    api.addProposal(title, toHex(link), decimalAmount, beneficiary).toPromise()
    setProposalPanel(false)
  }

  const { myStakes, totalActiveTokens } = useMemo(() => {
    if (!connectedAccount || !stakeToken.tokenDecimals || !proposals) {
      return { myStakes: [], totalActiveTokens: new BigNumber('0') }
    }

    return proposals.reduce(
      ({ myStakes, totalActiveTokens }, proposal) => {
        if (proposal.executed || !proposal.stakes) {
          return { myStakes, totalActiveTokens }
        }

        const totalActive = proposal.stakes.reduce((accumulator, stake) => {
          return accumulator.plus(stake.amount)
        }, new BigNumber('0'))

        totalActiveTokens = totalActiveTokens.plus(totalActive)

        const myStake = proposal.stakes.find(
          stake => stake.entity === connectedAccount
        )

        if (myStake) {
          myStakes.push({
            proposal: proposal.id,
            proposalName: proposal.name,
            stakedAmount: myStake.amount,
          })
        }
        return { myStakes, totalActiveTokens }
      },
      { myStakes: [], totalActiveTokens: new BigNumber('0') }
    )
  }, [proposals, connectedAccount, stakeToken.tokenDecimals])

  return {
    proposals,
    isSyncing: isSyncing || !blockHasLoaded,
    onProposalSubmit,
    proposalPanel,
    setProposalPanel,
    myStakes,
    totalActiveTokens,
  }
}
