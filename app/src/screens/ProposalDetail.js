import React from 'react'
import {
  BackButton,
  Bar,
  Box,
  GU,
  Text,
  textStyle,
  useLayout,
  useTheme,
  Link,
  Split,
} from '@aragon/ui'
import styled from 'styled-components'
import { useAragonApi } from '@aragon/api-react'
import LocalIdentityBadge from '../components/LocalIdentityBadge/LocalIdentityBadge'
import Balance from '../components/Balance'
import {
  ConvictionCountdown,
  ConvictionButton,
  ConvictionBar,
  ConvictionChart,
} from '../components/ConvictionVisuals'
import { addressesEqualNoSum as addressesEqual } from '../lib/web3-utils'

const H2 = styled.h2`
  ${textStyle('label2')};
  color: ${props => props.color};
  margin-bottom: ${1.5 * GU}px;
`

const Chart = styled.div`
  width: 100%;
`
function ProposalDetail({ proposal, onBack, requestToken }) {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const { api, connectedAccount } = useAragonApi()

  const {
    id,
    name,
    creator,
    beneficiary,
    link,
    requestedAmount,
    executed,
  } = proposal
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
                    <H2 color={theme.surfaceContentSecondary}>Link</H2>
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
                    <H2 color={theme.surfaceContentSecondary}>Created By</H2>
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
                      <H2 color={theme.surfaceContentSecondary}>Beneficiary</H2>
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
                    <Chart>
                      <H2 color={theme.surfaceContentSecondary}>
                        Conviction prediction
                      </H2>
                      <ConvictionChart
                        proposal={proposal}
                        withThreshold={!!requestToken}
                      />
                    </Chart>
                    <ConvictionButton
                      proposal={proposal}
                      onStake={() => api.stakeAllToProposal(id).toPromise()}
                      onWithdraw={() =>
                        api.withdrawAllFromProposal(id).toPromise()
                      }
                      onExecute={() =>
                        api.executeProposal(id, true).toPromise()
                      }
                    />
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
    </div>
  )
}

const Amount = ({
  requestedAmount = 0,
  requestToken: { symbol, decimals, verified },
}) => (
  <div>
    <H2 color={useTheme().surfaceContentSecondary}>Amount</H2>
    <Balance
      amount={requestedAmount}
      decimals={decimals}
      symbol={symbol}
      verified={verified}
    />
  </div>
)

export default ProposalDetail
