import React from 'react'
import { useAragonApi } from '@aragon/api-react'
import { LineChart, Text, useTheme } from '@aragon/ui'
import SummaryBar from './SummaryBar'
import {
  calcConviction,
  getThreshold,
  getMaxConviction,
} from '../lib/conviction'

function normalize(lines) {
  const max = Math.max(...lines.flat())
  return lines.map(line => line.map(n => n / max))
}

function calculateConviction(stakes = [], entity) {
  if (entity) {
    return calcConviction(
      stakes
        .filter(({ entity: _entity }) => entity === _entity)
        .map(({ time, tokensStaked }) => ({ time, tokensStaked }))
    )
  } else {
    return calcConviction(
      stakes.map(({ time, totalTokensStaked }) => ({
        time,
        tokensStaked: totalTokensStaked,
      }))
    )
  }
}

function getStakesAndThreshold(proposal = {}) {
  const { appState } = useAragonApi()
  const { convictionStakes, globalParams } = appState
  const { requestedAmount } = proposal
  const { funds, supply } = globalParams
  const stakes = convictionStakes.filter(
    stake => stake.proposal === proposal.id
  )
  const threshold = getThreshold(requestedAmount, funds, supply)
  const max = getMaxConviction(supply)
  return { stakes, threshold, max }
}

function ConvictionChart({ proposal }) {
  const { stakes, threshold } = getStakesAndThreshold(proposal)
  const entities = [...new Set(stakes.map(({ entity }) => entity))]
  const lines = entities.map(entity => calculateConviction(stakes, entity))

  if (lines[0]) {
    // Sum line
    lines.push(calculateConviction(stakes))
    // Threshold line
    if (!Number.isNaN(threshold) && threshold !== Number.POSITIVE_INFINITY) {
      lines.push(lines[0].map(i => threshold))
    }
  }

  return (
    <LineChart
      lines={normalize(lines)}
      total={lines[0] && lines[0].length}
      captionsHeight={20}
    />
  )
}

const ConvictionBar = ({ proposal }) => {
  const { connectedAccount } = useAragonApi()
  const theme = useTheme()
  const { stakes, threshold, max } = getStakesAndThreshold(proposal)
  const stake = calculateConviction(stakes).pop()
  const myStake =
    (connectedAccount && calculateConviction(stakes, connectedAccount).pop()) ||
    0
  const myStakedConviction = myStake / max
  const stakedConviction = stake / max
  const neededConviction = threshold / max
  return (
    <div>
      <SummaryBar
        positiveSize={myStakedConviction}
        negativeSize={stakedConviction - myStakedConviction}
        requiredSize={neededConviction}
        compact
      />
      <div>
        <Text color={theme.surfaceContent}>
          {Math.round(stakedConviction * 100)}%
        </Text>{' '}
        <Text color={theme.surfaceContentSecondary}>
          ({Math.round(neededConviction * 100)}% conviction needed)
        </Text>
      </div>
    </div>
  )
}

export { ConvictionChart, ConvictionBar }
