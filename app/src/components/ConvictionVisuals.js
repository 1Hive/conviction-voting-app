import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import { Timer, Text, Button, Tag, useTheme } from '@aragon/ui'
import LineChart from './ModifiedLineChart'
import styled from 'styled-components'
import SummaryBar from './SummaryBar'
import {
  getConvictionHistory,
  getConvictionHistoryByEntity,
  calculateThreshold,
  getMaxConviction,
  getMinNeededStake,
  getRemainingTimeToPass,
  getCurrentConviction,
  getCurrentConvictionByEntity,
  getConvictionTrend,
} from '../lib/conviction'
import { useBlockNumber } from '../BlockContext'

function getStakesAndThreshold(proposal = {}) {
  const { appState } = useAragonApi()
  const { convictionStakes, globalParams } = appState
  const { requestedAmount } = proposal
  const { funds, supply } = globalParams
  const stakes = convictionStakes.filter(
    stake => stake.proposal === parseInt(proposal.id)
  )
  const { totalTokensStaked } = [...stakes].pop() || { totalTokensStaked: 0 }
  const threshold = calculateThreshold(requestedAmount, funds, supply)
  const max = getMaxConviction(supply)
  return { stakes, totalTokensStaked, threshold, max }
}

function ConvictionChart({ proposal }) {
  const { stakes, threshold } = getStakesAndThreshold(proposal)
  const currentBlock = useBlockNumber()
  const entities = [...new Set(stakes.map(({ entity }) => entity))]
  const lines = entities.map(entity =>
    getConvictionHistoryByEntity(stakes, entity, currentBlock + 25)
  )

  if (lines[0]) {
    // Sum line
    lines.push(getConvictionHistory(stakes, currentBlock + 25))
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
      label={i => i - Math.floor((lines[0].length - 1) / 2)}
      captionsHeight={20}
    />
  )
}

const ConvictionBar = ({ proposal }) => {
  const { connectedAccount } = useAragonApi()
  const blockNumber = useBlockNumber()
  const theme = useTheme()
  const { stakes, totalTokensStaked, threshold, max } = getStakesAndThreshold(
    proposal
  )
  const conviction = getCurrentConviction(stakes, blockNumber)
  const myConviction =
    (connectedAccount &&
      getCurrentConvictionByEntity(stakes, connectedAccount, blockNumber)) ||
    0
  const futureConviction = getMaxConviction(totalTokensStaked)
  const myStakedConviction = myConviction / max
  const stakedConviction = conviction / max
  const futureStakedConviction = futureConviction / max
  const neededConviction = threshold / max
  return (
    <div>
      <SummaryBar
        firstSize={myStakedConviction}
        secondSize={stakedConviction - myStakedConviction}
        thirdSize={futureStakedConviction - stakedConviction}
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

function ConvictionCountdown({ proposal, onExecute }) {
  const blockNumber = useBlockNumber()
  const theme = useTheme()
  const { stakes, totalTokensStaked, threshold } = getStakesAndThreshold(
    proposal
  )
  const conviction = getCurrentConviction(stakes, blockNumber)
  const minTokensNeeded = getMinNeededStake(threshold)
  const time = getRemainingTimeToPass(threshold, conviction, totalTokensStaked)
  const WONT_PASS = 0
  const WILL_PASS = 1
  const CAN_PASS = 2
  const [view, setView] = useState(
    minTokensNeeded > totalTokensStaked
      ? WONT_PASS
      : time > 0
      ? WILL_PASS
      : CAN_PASS
  )
  const NOW = Date.now()
  const BLOCK_TIME = 1000 * 15
  const endDate = new Date(NOW + time * BLOCK_TIME)

  useEffect(() => {
    if (view === WILL_PASS) {
      const timer = setTimeout(() => {
        // TODO: Check with the API if it can be executed
        setView(CAN_PASS)
      }, time * BLOCK_TIME)
      return () => clearTimeout(timer)
    }
  }, [])

  return view === WONT_PASS ? (
    <>
      <Text color={theme.negative.toString()}> ✘ More stakes required</Text>
      <div>
        <Text>
          At least <Tag>{minTokensNeeded - totalTokensStaked} TKN</Tag> more
          needs to be staked in order for this proposal to pass at some point.
        </Text>
      </div>
    </>
  ) : view === WILL_PASS ? (
    <>
      <Text color={theme.positive.toString()}> ✓ Will pass</Text>
      <Timer end={endDate} />
    </>
  ) : (
    <>
      <Text color={theme.positive.toString()}> ✓ Can be executed</Text>
      <Button mode="strong" wide onClick={onExecute}>
        Execute proposal
      </Button>
    </>
  )
}

function ConvictionTrend({ proposal }) {
  const theme = useTheme()
  const { stakes, max } = getStakesAndThreshold(proposal)
  const blockNumber = useBlockNumber()
  const trend = getConvictionTrend(stakes, max, blockNumber)
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
