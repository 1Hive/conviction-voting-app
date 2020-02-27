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
} from '@aragon/ui'
import styled from 'styled-components'
import { useAragonApi } from '@aragon/api-react'
import LocalIdentityBadge from '../components/LocalIdentityBadge/LocalIdentityBadge'
import Balance from '../components/Balance'
import {
  ConvictionCountdown,
  ConvictionButton,
} from '../components/ConvictionVisuals'
import { addressesEqualNoSum as addressesEqual } from '../lib/web3-utils'

const Wrapper = styled.div`
  display: grid;
  grid-template-columns: auto;
  grid-column-gap: ${2.5 * GU}px;
  @media (min-width: 768px) {
    grid-template-columns: auto ${25 * GU}px;
  }
  min-height: 100vh;
  width: 100%;
`
const H2 = styled.h2`
  ${textStyle('label2')};
  color: ${props => props.color};
  margin-bottom: ${1.5 * GU}px;
`

const Progress = styled.div`
  width: 100%;
`

function ProposalDetail({ proposal, onBack, requestToken }) {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const { api, connectedAccount } = useAragonApi()

  const { id, name, creator, beneficiary, link } = proposal

  return (
    <Wrapper>
      <div>
        <Bar>
          <BackButton onClick={onBack} />
        </Bar>
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
              <div>
                <H2 color={theme.surfaceContentSecondary}>Links</H2>
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
                    No link provided.
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
                    connectedAccount={addressesEqual(creator, connectedAccount)}
                    entity={creator}
                  />
                </div>
              </div>
              <div>
                <H2 color={theme.surfaceContentSecondary}>Recipient</H2>
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
            </div>
            <Progress>
              <H2 color={theme.surfaceContentSecondary}>Conviction Progress</H2>
              {/* <ConvictionChart proposal={proposal} /> */}
            </Progress>
            <ConvictionButton
              proposal={proposal}
              onStake={() => api.stakeAllToProposal(id).toPromise()}
              onWithdraw={() => api.withdrawAllFromProposal(id).toPromise()}
              onExecute={() => api.executeProposal(id, true).toPromise()}
            />
          </section>
        </Box>
      </div>
      <div>
        <Box heading="Status">
          <ConvictionCountdown proposal={proposal} />
        </Box>
        <Box heading="Vault balance">
          <Balance {...requestToken} />
        </Box>
      </div>
    </Wrapper>
  )
}

export default ProposalDetail
