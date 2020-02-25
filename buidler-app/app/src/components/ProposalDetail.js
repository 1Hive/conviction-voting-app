import React from 'react'
import styled from 'styled-components'
import { Text, useTheme, GU, ExternalLink } from '@aragon/ui'
import {
  ConvictionChart,
  ConvictionCountdown,
  ConvictionButton,
} from './ConvictionVisuals'
import LocalIdentityBadge from '../components/LocalIdentityBadge/LocalIdentityBadge'

const ProposalDetail = ({ proposal, onStake, onWithdraw, onExecute }) => {
  const theme = useTheme()
  const { link, creator, beneficiary } = proposal

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
        <h2>
          <Text color={theme.textSecondary} smallcaps>
            Link
          </Text>
        </h2>
        {link ? (
          <ExternalLink href={link}>{link}</ExternalLink>
        ) : (
          'No link provided.'
        )}
        <div>
          <ConvictionButton
            proposal={proposal}
            {...{ onStake, onWithdraw, onExecute }}
          />
        </div>
        <h2>
          <Text color={theme.textSecondary} smallcaps>
            Conviction prediction
          </Text>
        </h2>
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
        <LocalIdentityBadge entity={creator} />
        <h2>
          <Text color={theme.textSecondary} smallcaps>
            Recipient
          </Text>
        </h2>
        <LocalIdentityBadge entity={beneficiary} />
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
