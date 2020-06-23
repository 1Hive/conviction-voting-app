import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import {
  BackButton,
  Bar,
  Box,
  Button,
  Field,
  GU,
  Text,
  textStyle,
  Link,
  SidePanel,
  Slider,
  Split,
  TextInput,
  useLayout,
  useTheme,
} from '@aragon/ui'
import styled from 'styled-components'
import { useAragonApi, useAppState } from '@aragon/api-react'
import LocalIdentityBadge from '../components/LocalIdentityBadge/LocalIdentityBadge'
import Balance from '../components/Balance'
import {
  ConvictionCountdown,
  ConvictionBar,
  ConvictionChart,
} from '../components/ConvictionVisuals'
import usePanelState from '../hooks/usePanelState'
import useAccountTotalStaked from '../hooks/useAccountTotalStaked'
import { useConvictionHistory } from '../hooks/useConvictionHistory'
import { addressesEqualNoSum as addressesEqual } from '../lib/web3-utils'
import SupportProposal from '../components/panels/SupportProposal'
import { formatTokenAmount } from '../lib/token-utils'
import { round, safeDiv, toDecimals } from '../lib/math-utils'
import BigNumber from '../lib/bigNumber'

const MAX_INPUT_DECIMAL_BASE = 6

function ProposalDetail({ proposal, onBack, requestToken }) {
  const { stakeToken } = useAppState()

  const theme = useTheme()
  const { layoutName } = useLayout()
  const { api, connectedAccount } = useAragonApi()
  const chartLines = useConvictionHistory(proposal)

  const panelState = usePanelState()

  const {
    id,
    name,
    creator,
    beneficiary,
    link,
    requestedAmount,
    executed,
    currentConviction,
    stakes,
    threshold,
  } = proposal

  const myStake = useMemo(
    () =>
      stakes.find(({ entity }) => addressesEqual(entity, connectedAccount)) || {
        amount: new BigNumber('0'),
      },
    [stakes, connectedAccount]
  )

  const myStakeAmountFormatted = formatTokenAmount(
    myStake.amount,
    stakeToken.tokenDecimals
  )

  const totalStaked = useAccountTotalStaked()

  const nonStakedTokens = useMemo(
    () => stakeToken.balance.minus(totalStaked).plus(myStake.amount),
    [myStake.amount, stakeToken.balance, totalStaked]
  )

  const formattedMaxAvailableAmount = useMemo(() => {
    if (!stakeToken) {
      return '0'
    }
    return formatTokenAmount(nonStakedTokens, stakeToken.tokenDecimals)
  }, [stakeToken, nonStakedTokens])

  const rounding = Math.min(MAX_INPUT_DECIMAL_BASE, stakeToken.decimals)

  const [
    { value: inputValue, max: maxAvailable, progress },
    setAmount,
    setProgress,
  ] = useAmount(
    myStakeAmountFormatted.replace(',', ''),
    formattedMaxAvailableAmount.replace(',', ''),
    rounding
  )

  const didIStaked = myStake?.amount.gt(new BigNumber('0'))

  const mode = useMemo(() => {
    if (currentConviction.gte(threshold)) {
      return 'execute'
    }
    if (didIStaked) {
      return 'update'
    }
    return 'support'
  }, [currentConviction, threshold, didIStaked])

  // Focus input
  const inputRef = useRef(null)

  const handleExecute = useCallback(() => {
    api.executeProposal(id, true).toPromise()
  }, [api, id])

  const handleChangeSupport = useCallback(() => {
    const newValue = new BigNumber(
      toDecimals(inputValue, stakeToken.tokenDecimals)
    )

    if (newValue.lt(myStake.amount)) {
      api
        .withdrawFromProposal(id, myStake.amount.minus(newValue).toString())
        .toPromise()
      return
    }

    api
      .stakeToProposal(id, newValue.minus(myStake.amount).toString())
      .toPromise()
  }, [api, id, inputValue, myStake.amount, stakeToken.tokenDecimals])

  const buttonProps = useMemo(() => {
    if (mode === 'execute') {
      return {
        text: 'Execute proposal',
        action: handleExecute,
        mode: 'strong',
        disabled: false,
      }
    }

    if (mode === 'update') {
      return {
        text: 'Change support',
        action: handleChangeSupport,
        mode: 'normal',
        disabled: myStakeAmountFormatted === inputValue.toString(),
      }
    }
    return {
      text: 'Support this proposal',
      action: panelState.requestOpen,
      mode: 'strong',
      disabled: false,
    }
  }, [
    mode,
    handleExecute,
    handleChangeSupport,
    panelState,
    myStakeAmountFormatted,
    inputValue,
  ])

  return (
    <div>
      <Bar>
        <BackButton onClick={onBack} />
      </Bar>
      <Split
        primary={
          <div>
            <Box>
              <section
                css={`
                  display: grid;
                  grid-template-rows: auto;
                  grid-gap: ${2.5 * GU}px;
                  margin-top: ${2.5 * GU}px;
                `}
              >
                <h1
                  css={`
                    ${textStyle('title2')};
                    font-weight: 600;
                  `}
                >
                  #{id} {name}
                </h1>
                <div
                  css={`
                    display: grid;
                    grid-template-columns: ${layoutName !== 'small'
                      ? 'auto auto auto auto'
                      : 'auto'};
                    grid-gap: ${layoutName !== 'small' ? 5 * GU : 2.5 * GU}px;
                  `}
                >
                  {requestToken && (
                    <Amount
                      requestedAmount={requestedAmount}
                      requestToken={requestToken}
                    />
                  )}
                  <div>
                    <Heading color={theme.surfaceContentSecondary}>
                      Link
                    </Heading>
                    {link ? (
                      <Link href={link} external>
                        Read more
                      </Link>
                    ) : (
                      <Text
                        css={`
                          ${textStyle('body2')};
                        `}
                      >
                        No link provided
                      </Text>
                    )}
                  </div>
                  <div>
                    <Heading color={theme.surfaceContentSecondary}>
                      Created By
                    </Heading>
                    <div
                      css={`
                        display: flex;
                        align-items: flex-start;
                      `}
                    >
                      <LocalIdentityBadge
                        connectedAccount={addressesEqual(
                          creator,
                          connectedAccount
                        )}
                        entity={creator}
                      />
                    </div>
                  </div>
                  {requestToken && (
                    <div>
                      <Heading color={theme.surfaceContentSecondary}>
                        Beneficiary
                      </Heading>
                      <div
                        css={`
                          display: flex;
                          align-items: flex-start;
                        `}
                      >
                        <LocalIdentityBadge
                          connectedAccount={addressesEqual(
                            beneficiary,
                            connectedAccount
                          )}
                          entity={beneficiary}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {!executed && (
                  <React.Fragment>
                    <div css="width: 100%;">
                      <Heading color={theme.surfaceContentSecondary}>
                        Conviction prediction
                      </Heading>
                      <ConvictionChart
                        proposal={proposal}
                        withThreshold={!!requestToken}
                        lines={chartLines}
                      />
                    </div>

                    {mode === 'update' && (
                      <Field label="Amount of your tokens for this proposal">
                        <div
                          css={`
                            display: flex;
                            justify-content: space-between;
                          `}
                        >
                          <div
                            css={`
                              width: 100%;
                            `}
                          >
                            <Slider
                              css={`
                                padding-left: 0px;
                                padding-right: ${2 * GU}px;
                              `}
                              value={progress}
                              onUpdate={setProgress}
                            />
                          </div>
                          <TextInput
                            value={inputValue}
                            onChange={setAmount}
                            type="number"
                            max={maxAvailable}
                            min={'0'}
                            required
                            ref={inputRef}
                            css={`
                              width: ${18 * GU}px;
                            `}
                          />
                        </div>
                      </Field>
                    )}
                    <Button
                      wide
                      mode={buttonProps.mode}
                      onClick={buttonProps.action}
                      disabled={buttonProps.disabled}
                    >
                      {buttonProps.text}
                    </Button>
                  </React.Fragment>
                )}
              </section>
            </Box>
          </div>
        }
        secondary={
          <div>
            {requestToken && (
              <Box heading="Status">
                <ConvictionCountdown proposal={proposal} />
              </Box>
            )}
            {!proposal.executed && (
              <Box heading="Conviction Progress">
                <ConvictionBar
                  proposal={proposal}
                  withThreshold={!!requestToken}
                />
              </Box>
            )}
          </div>
        }
      />
      <SidePanel
        title="Support this proposal"
        opened={panelState.visible}
        onClose={panelState.requestClose}
      >
        <SupportProposal id={id} onDone={panelState.requestClose} />
      </SidePanel>
    </div>
  )
}

const useAmount = (balance, maxAvailable, rounding) => {
  const [amount, setAmount] = useState({
    value: balance,
    max: maxAvailable,
    progress: safeDiv(balance, maxAvailable),
  })

  useEffect(() => {
    setAmount(prevState => {
      if (prevState.max === maxAvailable) {
        return prevState
      }
      const newValue = round(prevState.progress * maxAvailable, rounding)

      return {
        ...prevState,
        value: String(newValue),
        max: maxAvailable,
      }
    })
  }, [maxAvailable, rounding])

  useEffect(() => {
    setAmount(prevState => {
      if (prevState.value === balance) {
        return prevState
      }

      return {
        ...prevState,
        value: balance,
        progress: safeDiv(balance, maxAvailable),
      }
    })
  }, [balance, maxAvailable])

  const handleAmountChange = useCallback(
    event => {
      const newValue = Math.min(event.target.value, maxAvailable)
      const newProgress = safeDiv(newValue, maxAvailable)

      setAmount(prevState => ({
        ...prevState,
        value: String(newValue),
        progress: newProgress,
      }))
    },
    [maxAvailable]
  )

  const handleSliderChange = useCallback(
    newProgress => {
      const newValue =
        newProgress === 1
          ? round(Number(maxAvailable), rounding)
          : round(newProgress * maxAvailable, 2)

      setAmount(prevState => ({
        ...prevState,
        value: String(newValue),
        progress: newProgress,
      }))
    },
    [maxAvailable, rounding]
  )

  return [amount, handleAmountChange, handleSliderChange]
}

const Amount = ({
  requestedAmount = 0,
  requestToken: { symbol, decimals, verified },
}) => (
  <div>
    <Heading color={useTheme().surfaceContentSecondary}>Amount</Heading>
    <Balance
      amount={requestedAmount}
      decimals={decimals}
      symbol={symbol}
      verified={verified}
    />
  </div>
)

const Heading = styled.h2`
  ${textStyle('label2')};
  color: ${props => props.color};
  margin-bottom: ${1.5 * GU}px;
`

export default ProposalDetail
