import { useMemo } from 'react'
import { useAragonApi, useAppState } from '@aragon/api-react'
import BigNumber from '../lib/bigNumber'
import { useLatestBlock } from './useBlock'
import {
  calculateThreshold,
  getCurrentConviction,
  getCurrentConvictionByEntity,
  getConvictionTrend,
  getMaxConviction,
  getMinNeededStake,
  getRemainingTimeToPass,
} from '../lib/conviction'

const TIME_UNIT = (60 * 60 * 24) / 15

export function useProposals() {
  const { connectedAccount } = useAragonApi()
  const {
    proposals = [],
    convictionStakes,
    stakeToken,
    requestToken,
    globalParams: { alpha, maxRatio, weight },
  } = useAppState()

  const latestBlock = useLatestBlock()

  const proposalsWithData = useMemo(() => {
    return proposals.map(proposal => {
      const stakes = convictionStakes.filter(
        stake => stake.proposal === parseInt(proposal.id)
      )

      const totalTokensStaked = proposal?.stakes.reduce(
        (accumulator, stake) => {
          return accumulator.plus(stake.amount)
        },
        new BigNumber('0')
      )

      const threshold = calculateThreshold(
        proposal.requestedAmount,
        requestToken.amount || new BigNumber('0'),
        stakeToken.totalSupply || new BigNumber('0'),
        alpha,
        maxRatio,
        weight
      )

      const maxConviction = getMaxConviction(
        stakeToken.totalSupply || new BigNumber('0'),
        alpha
      )

      const currentConviction = getCurrentConviction(
        stakes,
        latestBlock.number,
        alpha
      )
      const userConviction = getCurrentConvictionByEntity(
        stakes,
        connectedAccount,
        latestBlock.number,
        alpha
      )
      const userStakedConviction = userConviction.div(maxConviction)
      const stakedConviction = currentConviction.div(maxConviction)
      const futureConviction = getMaxConviction(totalTokensStaked, alpha)
      const futureStakedConviction = futureConviction.div(maxConviction)
      const neededConviction = threshold.div(maxConviction)

      const minTokensNeeded = getMinNeededStake(threshold, alpha)

      const neededTokens = minTokensNeeded.minus(totalTokensStaked)

      const remainingTimeToPass = getRemainingTimeToPass(
        threshold,
        currentConviction,
        totalTokensStaked,
        alpha
      )

      const convictionTrend = getConvictionTrend(
        stakes,
        maxConviction,
        latestBlock.number,
        alpha,
        TIME_UNIT
      )

      return {
        ...proposal,
        currentConviction,
        userConviction,
        userStakedConviction,
        stakedConviction,
        futureConviction,
        futureStakedConviction,
        neededConviction,
        maxConviction,
        threshold,
        minTokensNeeded,
        neededTokens,
        remainingTimeToPass,
        convictionTrend,
      }
    })
  }, [proposals, latestBlock])

  return [proposalsWithData, latestBlock.number !== 0]
}
