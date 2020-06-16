import { useMemo } from 'react'
import { useAragonApi } from '@aragon/api-react'
import { calculateThreshold, getMaxConviction } from '../lib/conviction'
import BigNumber from 'bignumber.js'

export function getStakesAndThreshold(proposal = {}) {
  const { appState } = useAragonApi()
  const {
    convictionStakes,
    stakeToken,
    requestToken,
    globalParams: { alpha, maxRatio, weight },
  } = appState

  const { requestedAmount } = proposal

  const stakes = convictionStakes.filter(
    stake => stake.proposal === parseInt(proposal.id)
  )
  const totalTokensStaked = useMemo(() => {
    if (!proposal) {
      return new BigNumber('0')
    }
    return proposal?.stakes.reduce((accumulator, stake) => {
      return accumulator.plus(stake.amount)
    }, new BigNumber('0'))
  }, [proposal])

  const threshold = calculateThreshold(
    requestedAmount,
    requestToken.amount || new BigNumber('0'),
    stakeToken.totalSupply || new BigNumber('0'),
    alpha,
    maxRatio,
    weight
  )

  const max = getMaxConviction(
    stakeToken.totalSupply || new BigNumber('0'),
    alpha
  )

  return { stakes, totalTokensStaked, threshold, max }
}
