import React from 'react'
import styled from 'styled-components'
import { Text, useTheme, IdentityBadge, Timer, GU, Button } from '@aragon/ui'

const ProposalDetail = ({ description, creator, recipient }) => {
  const theme = useTheme()

  const NOW = Date.now()
  const DAY = 1000 * 60 * 60 * 24
  const endDate = new Date(NOW + 5 * DAY)

  return (
    <div
      css={`
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        width: 100%;
        flex-direction: ${'row'};
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
          <Button mode="strong">Vote for this proposal</Button>
        </div>
      </DetailsGroup>
      <DetailsGroup>
        <h2>
          <Text color={theme.textSecondary} smallcaps>
            Status
          </Text>
        </h2>
        <Text color={theme.positive}> ✓ Will pass</Text>
        <Timer end={endDate} />
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
        <IdentityBadge entity={recipient} />
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
