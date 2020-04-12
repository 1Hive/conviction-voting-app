import React, { useCallback } from 'react'
import {
  DataView,
  Link,
  GU,
  Text,
  Box,
  Tag,
  textStyle,
  useTheme,
  Split,
  Tabs,
} from '@aragon/ui'
import { useConnectedAccount } from '@aragon/api-react'

import {
  ConvictionBar,
  ConvictionTrend,
  ConvictionCountdown,
} from '../components/ConvictionVisuals'
import LocalIdentityBadge from '../components/LocalIdentityBadge/LocalIdentityBadge'
import FilterBar from '../components/FilterBar/FilterBar'
import Balance from '../components/Balance'

import { formatTokenAmount } from '../lib/token-utils'
import { addressesEqualNoSum as addressesEqual } from '../lib/web3-utils'

const ENTRIES_PER_PAGE = 6

const Proposals = React.memo(
  ({
    proposals,
    selectProposal,
    // executionTargets,
    filteredProposals,
    proposalExecutionStatusFilter,
    proposalSupportStatusFilter,
    proposalTextFilter,
    handleProposalSupportFilterChange,
    handleExecutionStatusFilterChange,
    handleSearchTextFilterChange,
    myLastStake,
    requestToken,
    stakeToken,
    myStakes,
  }) => {
    const theme = useTheme()
    const connectedAccount = useConnectedAccount()
    const openProposalFields = [
      { label: 'Conviction progress', align: 'start' },
      { label: 'Trend', align: 'start' },
    ]
    const executedProposalFields = [
      { label: 'Beneficiary', align: 'start' },
      { label: 'Link', align: 'start' },
    ]
    const tabs = ['Open Proposals', 'Executed Proposals']
    const fields =
      proposalExecutionStatusFilter === 0
        ? openProposalFields
        : proposalExecutionStatusFilter === 1
        ? executedProposalFields
        : []
    const executedProposals =
      proposalExecutionStatusFilter === 0
        ? proposals.filter(({ executed }) => !executed)
        : proposalExecutionStatusFilter === 1
        ? proposals.filter(({ executed }) => executed)
        : []

    const handleTabChange = useCallback(
      tabIndex => {
        handleExecutionStatusFilterChange(tabIndex)
      },
      [handleExecutionStatusFilterChange]
    )

    const updateTextFilter = useCallback(
      textValue => {
        handleSearchTextFilterChange(textValue)
      },
      [handleSearchTextFilterChange]
    )

    return (
      <Split
        primary={
          <div>
            <Tabs
              items={tabs}
              selected={proposalExecutionStatusFilter}
              onChange={handleTabChange}
            />
            <DataView
              fields={[
                { label: 'Proposal', align: 'start' },
                { label: 'Requested', align: 'start' },
                ...fields,
                { label: 'Status', align: 'start' },
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
                      {myStakes.has(proposal.id) && (
                        <Tag>
                          {`✓ Supported: ${myStakes.get(proposal.id)} ${
                            stakeToken.tokenSymbol
                          }`}
                        </Tag>
                      )}
                    </div>,
                    <ConvictionTrend proposal={proposal} />
                  )
                else
                  entriesElements.push(
                    <LocalIdentityBadge
                      connectedAccount={addressesEqual(
                        proposal.creator,
                        connectedAccount
                      )}
                      entity={proposal.creator}
                    />,
                    <Link href={proposal.link} external>
                      Read more
                    </Link>
                  )
                entriesElements.push(
                  <ConvictionCountdown proposal={proposal} shorter />
                )
                return entriesElements
              }}
              tableRowHeight={14 * GU}
              heading={
                <FilterBar
                  proposalsSize={executedProposals.length}
                  proposalStatusFilter={proposalSupportStatusFilter}
                  proposalTextFilter={proposalTextFilter}
                  handleProposalStatusFilterChange={
                    handleProposalSupportFilterChange
                  }
                  handleTextFilterChange={updateTextFilter}
                  disableDropDownFilter={proposalExecutionStatusFilter === 1}
                />
              }
              entriesPerPage={ENTRIES_PER_PAGE}
            />
          </div>
        }
        secondary={
          <div>
            <Box heading="Organization funds">
              <span
                css={`
                  color: ${theme.contentSecondary};
                  ${textStyle('body2')}
                `}
              >
                Funding Pool
              </span>
              <Balance
                {...requestToken}
                color={theme.positive}
                size={textStyle('title3')}
              />
            </Box>
            {myLastStake && myLastStake.tokensStaked > 0 && (
              <Box heading="My staked proposal" key={myLastStake.proposal}>
                <ProposalInfo
                  proposal={
                    proposals.filter(({ id }) => id === myLastStake.proposal)[0]
                  }
                  stake={myLastStake}
                  stakeToken={stakeToken}
                />
              </Box>
            )}
          </div>
        }
        invert="vertical"
      />
    )
  }
)

const ProposalInfo = ({
  proposal,
  stake,
  stakeToken: { tokenDecimals, tokenSymbol },
}) => (
  <div>
    <IdAndTitle {...proposal} />
    <Tag
      css={`
        margin-left: 5px;
      `}
    >{`✓ Voted with ${formatTokenAmount(
      stake.tokensStaked,
      tokenDecimals
    )} ${tokenSymbol}`}</Tag>
    <ConvictionBar proposal={proposal} />
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
