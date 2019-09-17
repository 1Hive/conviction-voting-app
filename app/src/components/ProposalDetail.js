import React from 'react'
import styled from 'styled-components'
import { Text, useTheme, IdentityBadge, GU, Button } from '@aragon/ui'
import { ConvictionChart, ConvictionCountdown } from './ConvictionVisuals'

const ProposalDetail = ({
  proposal,
  onStake,
  onWithdraw,
  isStaked = false,
}) => {
  const theme = useTheme()
  const { description, creator, beneficiary } = proposal

  return (
    <div
      css={`
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        width: 100%;
        flex-direction: ${'row'};
        margin: ${3 * GU}px 0;
      `}
    >
      <DetailsGroup>
        <h1>
          <Text size="large">About this proposal</Text>
        </h1>
        <h2>
          <Text color={theme.textSecondary} smallcaps>
            Description
          </Text>
        </h2>
        {description}
        <div>
          {!isStaked ? (
            <Button mode="strong" onClick={onStake}>
              Vote for this proposal
            </Button>
          ) : (
            <Button onClick={onWithdraw}>Revoke conviction</Button>
          )}
        </div>
        <ConvictionChart proposal={proposal} />
      </DetailsGroup>
      <DetailsGroup>
        <h2>
          <Text color={theme.textSecondary} smallcaps>
            Status
          </Text>
        </h2>
        <ConvictionCountdown proposal={proposal} />
        <h2>
          <Text color={theme.textSecondary} smallcaps>
            Created by
          </Text>
        </h2>
        <IdentityBadge entity={creator} />
        <h2>
          <Text color={theme.textSecondary} smallcaps>
            Recipient
          </Text>
        </h2>
        <IdentityBadge entity={beneficiary} />
      </DetailsGroup>
    </div>
  )
}

const DetailsGroup = styled.div`
  width: ${p => (p.compact ? '100%' : '50%')};
  & + & {
    margin-left: ${p => (p.compact ? '0' : `${5 * GU}px`)};
  }
`

export default ProposalDetail
