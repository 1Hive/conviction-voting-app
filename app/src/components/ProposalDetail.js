import React from 'react'
import styled from 'styled-components'
import { Text, useTheme, IdentityBadge, Timer, GU, Button } from '@aragon/ui'
import Chart from './Chart'

const ProposalDetail = ({
  description,
  creator,
  beneficiary,
  requestedAmount,
  onStake,
  onWithdraw,
  isStaked = false,
  stakes,
  globalParams: { supply, funds } = {},
}) => {
  const theme = useTheme()

  const chartProps = {
    requested: requestedAmount,
    stakes,
    supply,
    funds,
  }

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
        <Chart {...chartProps} />
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
