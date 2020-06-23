import { useMemo } from 'react'
import { useAppState, useAragonApi } from '@aragon/api-react'
import { useLatestBlock } from './useBlock'
import {
  getConvictionHistory,
  getConvictionHistoryByEntity,
} from '../lib/conviction'

const TIME_UNIT = (60 * 60 * 24) / 15

export function useConvictionHistory(proposal) {
  const { connectedAccount } = useAragonApi()
  const latestBlock = useLatestBlock()
  const {
    convictionStakes,
    globalParams: { alpha },
  } = useAppState()

  const stakes = useMemo(() => {
    if (!convictionStakes || !proposal) {
      return []
    }
    return convictionStakes.filter(
      stake => stake.proposal === parseInt(proposal.id)
    )
  }, [convictionStakes, proposal])

  const convictionHistory = getConvictionHistory(
    stakes,
    latestBlock.number + 25 * TIME_UNIT,
    alpha,
    TIME_UNIT
  )

  const userConvictionHistory = connectedAccount
    ? getConvictionHistoryByEntity(
        stakes,
        connectedAccount,
        latestBlock.number + 25 * TIME_UNIT,
        alpha,
        TIME_UNIT
      )
    : []

  return [convictionHistory, userConvictionHistory]
}
