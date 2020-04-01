import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import { Timer, Text, Tag, Button, useTheme } from '@aragon/ui'
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
import { fromDecimals } from '../lib/math-utils'

function getStakesAndThreshold(proposal = {}) {
  const { appState } = useAragonApi()
  const { convictionStakes, stakeToken, requestToken } = appState
  const { maxRatio, weight } = getGlobalParams()
  const { requestedAmount } = proposal
  const stakes = convictionStakes.filter(
    stake => stake.proposal === parseInt(proposal.id)
  )
  const { totalTokensStaked } = [...stakes].pop() || { totalTokensStaked: 0 }
  const threshold = calculateThreshold(
    requestedAmount,
    requestToken.amount || 0,
    stakeToken.tokenSupply || 0,
    maxRatio,
    weight
  )
  const max = getMaxConviction(stakeToken.tokenSupply || 0)
  return { stakes, totalTokensStaked, threshold, max }
}

export function ConvictionChart({ proposal, width = '50%' }) {
  const { stakes, threshold } = getStakesAndThreshold(proposal)
  const currentBlock = useBlockNumber()
  const { connectedAccount } = useAragonApi()
  const { alpha } = getGlobalParams()
  const theme = useTheme()

  const lines = [
    getConvictionHistory(stakes, currentBlock + 25, alpha),
    getConvictionHistoryByEntity(
      stakes,
      connectedAccount,
      currentBlock + 25,
      alpha
    ),
  ]

  // Divides all the numbers of an array of arrays by the biggest in the arrays
  const normalize = (lines, n) => {
    const max = Math.max(...lines.flat(), n)
    return lines.map(line => line.map(n => n / max))
  }

  const normalizeN = n => n / Math.max(...lines.flat(), n)

  return (
    <LineChart
      width={width}
      lines={normalize(lines, threshold)}
      total={lines[0] && lines[0].length}
      label={i => i - Math.floor((lines[0].length - 1) / 2)}
      captionsHeight={20}
      color={i => [theme.info, theme.infoSurfaceContent][i]}
      threshold={
        !Number.isNaN(threshold) && threshold !== Number.POSITIVE_INFINITY
          ? normalizeN(threshold)
          : 1
      }
    />
  )
}

export function ConvictionBar({ proposal }) {
  const { connectedAccount } = useAragonApi()
  const { alpha } = getGlobalParams()
  const blockNumber = useBlockNumber()
  const theme = useTheme()

  const { stakes, totalTokensStaked, threshold, max } = getStakesAndThreshold(
    proposal
  )
  const conviction = getCurrentConviction(stakes, blockNumber, alpha)
  const myConviction =
    (connectedAccount &&
      getCurrentConvictionByEntity(
        stakes,
        connectedAccount,
        blockNumber,
        alpha
      )) ||
    0
  const futureConviction = getMaxConviction(totalTokensStaked, alpha)
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
          (
          {isFinite(neededConviction) ? (
            `${Math.round(neededConviction * 100)}% `
          ) : (
            <React.Fragment>&infin; </React.Fragment>
          )}
          conviction needed)
        </Text>
      </div>
    </div>
  )
}

export function ConvictionButton({ proposal, onStake, onWithdraw, onExecute }) {
  const { alpha } = getGlobalParams()
  const blockNumber = useBlockNumber()
  const { connectedAccount } = useAragonApi()
  const { stakes, threshold } = getStakesAndThreshold(proposal)
  const conviction = getCurrentConviction(stakes, blockNumber, alpha)
  const myStakes = stakes.filter(({ entity }) => entity === connectedAccount)
  const didIStaked = myStakes.length > 0 && [...myStakes].pop().tokensStaked > 0
  return conviction >= threshold ? (
    <Button mode="strong" wide onClick={onExecute}>
      Execute proposal
    </Button>
  ) : didIStaked ? (
    <Button wide onClick={onWithdraw}>
      Withdraw support
    </Button>
  ) : (
    <Button mode="strong" wide onClick={onStake}>
      Support this proposal
    </Button>
  )
}

export function ConvictionCountdown({ proposal }) {
  const { alpha, maxRatio } = getGlobalParams()
  const {
    appState: {
      stakeToken: { tokenSymbol, tokenDecimals },
    },
  } = useAragonApi()
  const blockNumber = useBlockNumber()
  const theme = useTheme()
  const { executed } = proposal
  const { stakes, totalTokensStaked, threshold } = getStakesAndThreshold(
    proposal
  )
  const conviction = getCurrentConviction(stakes, blockNumber, alpha)
  const minTokensNeeded = getMinNeededStake(threshold, alpha)
  const neededTokens = parseInt(minTokensNeeded - totalTokensStaked)
  const time = getRemainingTimeToPass(
    threshold,
    conviction,
    totalTokensStaked,
    alpha
  )

  const UNABLE_TO_PASS = 0
  const MAY_PASS = 1
  const AVAILABLE = 2
  const EXECUTED = 3

  const getView = () =>
    executed
      ? EXECUTED
      : conviction >= threshold
      ? AVAILABLE
      : time > 0
      ? MAY_PASS
      : UNABLE_TO_PASS
  const [view, setView] = useState(getView())

  const NOW = Date.now()
  const BLOCK_TIME = 1000 * 15
  const endDate =
    !isNaN(new Date(NOW + time * BLOCK_TIME).getTime()) &&
    new Date(NOW + time * BLOCK_TIME)
  useEffect(() => {
    setView(getView())
  }, [conviction, threshold, time])

  return view === UNABLE_TO_PASS ? (
    <>
      <Text color={theme.negative.toString()}> ✘ Won't pass</Text>
      <div>
        <Text color={theme.surfaceContent.toString()}>
          {!isNaN(neededTokens)
            ? 'Insufficient staked tokens'
            : 'Not enough funds in the organization'}
        </Text>
        <br />
        <Text color={theme.surfaceContentSecondary.toString()}>
          (
          {!isNaN(neededTokens) ? (
            <React.Fragment>
              At least{' '}
              <Tag>
                {parseFloat(
                  fromDecimals(neededTokens.toString(), tokenDecimals)
                )
                  .toFixed(2)
                  .toString()}{' '}
                {tokenSymbol}
              </Tag>{' '}
              more needed
            </React.Fragment>
          ) : (
            `Funding requests must be below ${maxRatio *
              100}% organization total funds`
          )}
          ).
        </Text>
      </div>
    </>
  ) : view === MAY_PASS ? (
    <>
      <Text color={theme.positive.toString()}> ✓ May pass</Text>
      <br />
      <Text color={theme.surfaceContentSecondary.toString()}>
        Estimate until pass
      </Text>
      {!!endDate && <Timer end={endDate} />}
    </>
  ) : view === EXECUTED ? (
    <Text color={theme.positive.toString()}> ✓ Executed</Text>
  ) : (
    <>
      <Text color={theme.positive.toString()}> ✓ Available for execution</Text>
    </>
  )
}

export function ConvictionTrend({ proposal }) {
  const theme = useTheme()
  const { stakes, max } = getStakesAndThreshold(proposal)
  const blockNumber = useBlockNumber()
  const { alpha } = getGlobalParams()
  const trend = getConvictionTrend(stakes, max, blockNumber, alpha)

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

function getGlobalParams() {
  const {
    appState: { globalParams },
  } = useAragonApi()
  return globalParams
}

const Centered = styled.div`
  text-align: center;
`
