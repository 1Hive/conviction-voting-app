import React from 'react'
import {
  DataView,
  Link,
  GU,
  Text,
  Box,
  DropDown,
  Tag,
  textStyle,
  useTheme,
} from '@aragon/ui'
import styled from 'styled-components'

import Balance from '../components/Balance'
import { ConvictionBar, ConvictionTrend } from '../components/ConvictionVisuals'

const Wrapper = styled.div`
  display: grid;
  grid-template-columns: auto;
  grid-column-gap: ${2.5 * GU}px;
  @media (min-width: 768px) {
    grid-template-columns: 160px auto;
  }
  min-height: 100vh;
`

const Proposals = React.memo(function Proposals({
  proposals,
  selectProposal,
  // executionTargets,
  filteredProposals,
  proposalStatusFilter,
  handleProposalStatusFilterChange,
  myLastStake,
  requestToken,
}) {
  return (
    <Wrapper>
      <div>
        <Box heading="Vault balance">
          <Balance {...requestToken} />
        </Box>
        {myLastStake && myLastStake.tokensStaked > 0 && (
          <Box heading="My staked proposal" key={myLastStake.proposal}>
            <ProposalInfo
              proposal={
                proposals.filter(({ id }) => id === myLastStake.proposal)[0]
              }
              stake={myLastStake}
            />
          </Box>
        )}
      </div>
      <div>
        <DataView
          fields={[
            { label: 'Proposal', priority: 1, align: 'start' },
            { label: 'Requested', priority: 4, align: 'start' },
            { label: 'Conviction progress', priority: 2, align: 'start' },
            { label: 'Trend', priority: 5, align: 'start' },
          ]}
          statusEmpty={
            <h2
              css={`
                ${textStyle('title2')};
                font-weight: 600;
              `}
            >
              No proposals yet!
            </h2>
          }
          entries={filteredProposals}
          renderEntry={proposal => {
            const entriesElements = [
              <IdAndTitle
                id={proposal.id}
                name={proposal.name}
                selectProposal={selectProposal}
              />,
              <Amount
                requestedAmount={proposal.requestedAmount}
                requestToken={requestToken}
              />,
            ]
            if (!proposal.executed)
              entriesElements.push(
                <div
                  css={`
                    width: ${23 * GU};
                  `}
                >
                  <ConvictionBar proposal={proposal} />
                </div>,
                <ConvictionTrend proposal={proposal} />
              )
            return entriesElements
          }}
          tableRowHeight={14 * GU}
          heading={
            <Filters
              proposalStatusFilter={proposalStatusFilter}
              handleProposalStatusFilterChange={
                handleProposalStatusFilterChange
              }
              proposals={proposals}
            />
          }
        />
      </div>
    </Wrapper>
  )
})

const ProposalInfo = ({ proposal, stake, tokenSymbol }) => (
  <div>
    <IdAndTitle {...proposal} />
    <Tag>{`✓ Voted with ${stake.tokensStaked} ${tokenSymbol}`}</Tag>
    <ConvictionBar proposal={proposal} />
  </div>
)

const Filters = ({
  proposalStatusFilter,
  handleProposalStatusFilterChange,
  proposals,
}) => (
  <div
    css={`
      display: grid;
      grid-template-rows: auto;
      grid-row-gap: ${2 * GU}px;
    `}
  >
    <h2
      css={`
        ${textStyle('title4')};
      `}
    >
      Proposals
    </h2>
    <div
      css={`
        display: grid;
        grid-template-columns: auto auto auto 1fr;
        align-items: center;
        grid-column-gap: ${2 * GU}px;
      `}
    >
      <Text>Filter by</Text>
      <DropDown
        header="Status"
        placeholder="Status"
        selected={proposalStatusFilter}
        onChange={handleProposalStatusFilterChange}
        items={[
          <div>
            All
            <span
              css={`
                margin-left: ${1.5 * GU}px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: ${useTheme().info};
                ${textStyle('label3')};
              `}
            >
              <Tag limitDigits={4} label={proposals.length} size="small" />
            </span>
          </div>,
          'Open',
          'Closed',
        ]}
        width="128px"
      />
    </div>
  </div>
)

const IdAndTitle = ({ id, name, selectProposal }) => (
  <Link onClick={() => selectProposal(id)}>
    <Text color={useTheme().surfaceContent.toString()}>#{id}</Text>{' '}
    <Text color={useTheme().surfaceContentSecondary.toString()}>{name}</Text>
  </Link>
)

const Amount = ({
  requestedAmount = 0,
  requestToken: { symbol, decimals, verified },
}) => (
  <div>
    <Balance
      amount={requestedAmount}
      decimals={decimals}
      symbol={symbol}
      verified={verified}
    />
  </div>
)

export default Proposals
