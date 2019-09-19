import React from 'react'
import { useAragonApi } from '@aragon/api-react'
import { LineChart, Timer, Text, Button, useTheme } from '@aragon/ui'
import styled from 'styled-components'
import SummaryBar from './SummaryBar'
import {
  getConvictionHistory,
  getConvictionHistoryByEntity,
  getThreshold,
  getMaxConviction,
  getMinNeededStake,
  getRemainingTimeToPass,
  getCurrentConviction,
  getCurrentConvictionByEntity,
  getConvictionTrend,
} from '../lib/conviction'

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
  const lines = entities.map(entity =>
    getConvictionHistoryByEntity(stakes, entity)
  )

  if (lines[0]) {
    // Sum line
    lines.push(getConvictionHistory(stakes))
    // Threshold line
    if (!Number.isNaN(threshold) && threshold !== Number.POSITIVE_INFINITY) {
      lines.push(lines[0].map(i => threshold))
    }
  }

  // Divides all the numbers of an array of arrays by the biggest in the arrays
  const normalize = lines => {
    const max = Math.max(...lines.flat())
    return lines.map(line => line.map(n => n / max))
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
  const conviction = getCurrentConviction(stakes)
  const myConviction =
    (connectedAccount &&
      getCurrentConvictionByEntity(stakes, connectedAccount)) ||
    0
  const myStakedConviction = myConviction / max
  const stakedConviction = conviction / max
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
        <Text color={theme.surfaceContent.toString()}>
          {Math.round(stakedConviction * 100)}%
        </Text>{' '}
        <Text color={theme.surfaceContentSecondary.toString()}>
          ({Math.round(neededConviction * 100)}% conviction needed)
        </Text>
      </div>
    </div>
  )
}

function ConvictionCountdown({ proposal }) {
  const { api } = useAragonApi()
  const theme = useTheme()
  const { stakes, threshold } = getStakesAndThreshold(proposal)
  const lastStake = [...stakes].pop() || { totalTokensStaked: 0 }
  const conviction = getCurrentConviction(stakes)
  const minTokensNeeded = getMinNeededStake(threshold)
  const time = getRemainingTimeToPass(
    threshold,
    conviction,
    lastStake.totalTokensStaked
  )
  // TODO: Time are blocks, not days
  const NOW = Date.now()
  const DAY = 1000 * 60 * 60 * 24
  const endDate = new Date(NOW + time * DAY)
  return minTokensNeeded > lastStake.totalTokensStaked ? (
    <>
      <Text color={theme.negative.toString()}> ✘ More stakes required</Text>
      <div>
        <Text>
          At least {minTokensNeeded} TKN more needs to be staked in order for
          this proposal to pass at some point.
        </Text>
      </div>
    </>
  ) : time > 0 ? (
    <>
      <Text color={theme.positive.toString()}> ✓ Will pass</Text>
      <Timer end={endDate} />
    </>
  ) : (
    <>
      <Text color={theme.positive.toString()}> ✓ Has passed</Text>
      <Button mode="strong" wide onClick={() => api.enactProposal(proposal.id)}>
        Enact proposal
      </Button>
    </>
  )
}

function ConvictionTrend({ proposal }) {
  const theme = useTheme()
  const { stakes, max } = getStakesAndThreshold(proposal)
  const trend = getConvictionTrend(stakes, max)
  const percentage =
    trend > 0.1 ? Math.round(trend * 100) : Math.round(trend * 1000) / 10
  return (
    <Centered>
      <Text>{trend > 0 ? '↑ Upwards' : '↓ Downwards'}</Text>
      <Text.Block
        size="xxlarge"
        color={percentage < 0 ? theme.negative.toString() : ''}
      >
        {percentage > 0 && '+'}
        {percentage}%
      </Text.Block>
    </Centered>
  )
}

const Centered = styled.div`
  text-align: center;
`

export { ConvictionChart, ConvictionBar, ConvictionCountdown, ConvictionTrend }
