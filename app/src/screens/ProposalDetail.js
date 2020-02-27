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
import { useConnectedAccount } from '@aragon/api-react'
import LocalIdentityBadge from '../components/LocalIdentityBadge/LocalIdentityBadge'
import { addressesEqualNoSum as addressesEqual } from '../lib/web3-utils'

const DEFAULT_DESCRIPTION =
  'No additional description has been provided for this proposal.'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
`
const H2 = styled.h2`
  ${textStyle('label2')};
  color: ${props => props.color};
  margin-bottom: ${1.5 * GU}px;
`

const InfoWrapper = styled.div`
  display: grid;
  grid-template-row: auto;
  grid-row-gap: ${3 * GU}px;
`

const Progress = styled.div`
  width: 100%;
`

function ProposalDetail({ proposal, onBack }) {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const connectedAccount = useConnectedAccount()

  const { id, name, description, creator, beneficiary, link } = proposal

  return (
    <Wrapper>
      <Bar>
        <BackButton onClick={onBack} />
      </Bar>
      <Box>
        <section
          css={`
            display: grid;
            grid-template-columns: auto;
            grid-template-rows: auto;
            grid-gap: ${2.5 * GU}px;
            margin-top: ${2.5 * GU}px;
          `}
        >
          <div>
            <h1
              css={`
                ${textStyle('title2')};
                font-weight: 600;
                margin-bottom: ${2.5 * GU}px;
              `}
            >
              #{id} {name}
            </h1>
            <div
              css={`
                display: grid;
                grid-template-columns: ${layoutName !== 'small'
                  ? '1fr minmax(240px, auto)'
                  : 'auto'};
                grid-gap: ${layoutName !== 'small' ? 5 * GU : 2.5 * GU}px;
              `}
            >
              <InfoWrapper>
                <div>
                  <H2 color={theme.surfaceContentSecondary}>Description</H2>
                  <Text
                    css={`
                      ${textStyle('body2')};
                    `}
                  >
                    {description || DEFAULT_DESCRIPTION}
                  </Text>
                </div>
                {link && (
                  <div>
                    <H2 color={theme.surfaceContentSecondary}>Links</H2>
                    <Link href={link} external>
                      Read more
                    </Link>
                  </div>
                )}
              </InfoWrapper>
              <InfoWrapper>
                <div>
                  <H2 color={theme.surfaceContentSecondary}>Status</H2>
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
              </InfoWrapper>
            </div>
          </div>
          <Progress>
            <H2 color={theme.surfaceContentSecondary}>Conviction Progress</H2>
          </Progress>
        </section>
      </Box>
    </Wrapper>
  )
}

export default ProposalDetail
