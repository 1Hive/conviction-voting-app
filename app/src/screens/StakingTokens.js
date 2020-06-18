import React, { useMemo } from 'react'
import {
  Box,
  Distribution,
  Field,
  GU,
  textStyle,
  useTheme,
  useViewport,
} from '@aragon/ui'
import { formatTokenAmount } from '../lib/token-utils'
import { stakesPercentages, pct } from '../lib/math-utils'
import BigNumber from '../lib/bigNumber'

const DISTRIBUTION_ITEMS_MAX = 6

function displayedStakes(stakes, total) {
  return stakesPercentages(
    stakes.map(({ stakedAmount }) => stakedAmount),
    {
      total,
      maxIncluded: DISTRIBUTION_ITEMS_MAX,
    }
  ).map((stake, index) => ({
    item:
      stake.index === -1
        ? 'Others'
        : `#${stakes[stake.index].proposal}${' '}${
            stakes[stake.index].proposalName
          }`,
    percentage: stake.percentage,
  }))
}

const StakingTokens = React.memo(function StakingTokens({
  stakeToken,
  myStakes,
  totalActiveTokens,
}) {
  const theme = useTheme()
  const { below } = useViewport()
  const compact = below('large')

  const myActiveTokens = useMemo(() => {
    if (!myStakes) {
      return null
    }
    return myStakes.reduce((accumulator, stake) => {
      return accumulator.plus(stake.stakedAmount)
    }, new BigNumber('0'))
  }, [myStakes])

  const stakes = useMemo(() => {
    if (!myStakes || !myActiveTokens) {
      return null
    }
    return displayedStakes(myStakes, myActiveTokens)
  }, [myStakes, myActiveTokens])

  const inactiveTokens = useMemo(() => {
    if (!stakeToken.balance || !myActiveTokens) {
      return null
    }
    return stakeToken.balance - myActiveTokens
  }, [stakeToken.balance, myActiveTokens])

  return (
    <Box heading="Staking tokens" padding={0}>
      <div
        css={`
          border-bottom: 1px solid ${theme.border};
        `}
      >
        <div
          css={`
            padding: ${3 * GU}px;
          `}
        >
          <Field
            label="Your tokens"
            css={`
              margin-bottom: 0px;
            `}
          >
            <div
              css={`
                ${textStyle('title2')};
              `}
            >
              {`${
                stakeToken.balance
                  ? formatTokenAmount(
                      stakeToken.balance,
                      stakeToken.tokenDecimals
                    )
                  : '-'
              } ${stakeToken.tokenSymbol}`}
            </div>
            <div
              css={`
                ${textStyle('body4')};
                color: ${theme.contentSecondary};
              `}
            >
              {stakeToken.balance
                ? pct(stakeToken.balance, stakeToken.totalSupply)
                : '-'}
              % of total tokens
            </div>
          </Field>
        </div>
      </div>
      {myStakes && myActiveTokens.gt(new BigNumber('0')) && (
        <div
          css={`
            border-bottom: 1px solid ${theme.border};
          `}
        >
          <div
            css={`
              padding: ${3 * GU}px;
            `}
          >
            <Field
              label="Your active tokens"
              css={`
                margin-bottom: 0px;
              `}
            >
              <div
                css={`
                  ${textStyle('title2')};
                  color: ${theme.infoSurfaceContent};
                `}
              >
                {`${
                  myActiveTokens
                    ? formatTokenAmount(
                        myActiveTokens,
                        stakeToken.tokenDecimals
                      )
                    : '-'
                } ${stakeToken.tokenSymbol}`}
              </div>
              <div
                css={`
                  ${textStyle('body4')};
                  color: ${theme.contentSecondary};
                `}
              >
                Total Active Tokens:{' '}
                {formatTokenAmount(totalActiveTokens, stakeToken.tokenDecimals)}{' '}
                {stakeToken.tokenSymbol}
              </div>
            </Field>

            <Field
              label="SUPPORTED PROPOSALS"
              css={`
                margin-top: ${3 * GU}px;
              `}
            >
              <div
                css={`
                  margin-top: ${2 * GU}px;
                `}
              >
                <Distribution
                  heading="Your active token distribution"
                  items={stakes}
                  renderLegendItem={({ item }) => {
                    return (
                      <div
                        css={`
                          background: #daeaef;
                          border-radius: 3px;
                          padding: ${0.5 * GU}px ${1 * GU}px;
                          width: ${compact ? '100%' : `${18 * GU}px`};
                          text-overflow: ellipsis;
                          overflow: hidden;
                          white-space: nowrap;
                        `}
                      >
                        {item}
                      </div>
                    )
                  }}
                />
              </div>
            </Field>
          </div>
        </div>
      )}
      <div
        css={`
          padding-left: ${3 * GU}px;
          padding-right: ${3 * GU}px;
          padding-top: ${3 * GU}px;
        `}
      >
        <Field label="Your inactive tokens">
          <div
            css={`
              ${textStyle('title2')};
            `}
          >
            {`${
              inactiveTokens
                ? formatTokenAmount(inactiveTokens, stakeToken.tokenDecimals)
                : '-'
            } ${stakeToken.tokenSymbol}`}
          </div>
        </Field>
      </div>
    </Box>
  )
})

export default StakingTokens
