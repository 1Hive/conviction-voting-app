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
import { formatTokenAmount } from '../lib/token-utils'

import {
  ConvictionBar,
  ConvictionTrend,
  ConvictionCountdown,
} from '../components/ConvictionVisuals'
import LocalIdentityBadge from '../components/LocalIdentityBadge/LocalIdentityBadge'
import FilterBar from '../components/FilterBar/FilterBar'
import Balance from '../components/Balance'
import StakingTokens from './StakingTokens'

import { addressesEqualNoSum as addressesEqual } from '../lib/web3-utils'

const ENTRIES_PER_PAGE = 6

const Proposals = React.memo(
  ({
    selectProposal,
    filteredProposals,
    proposalExecutionStatusFilter,
    proposalSupportStatusFilter,
    proposalTextFilter,
    handleProposalSupportFilterChange,
    handleExecutionStatusFilterChange,
    handleSearchTextFilterChange,
    requestToken,
    stakeToken,
    myStakes,
    myActiveTokens,
    totalActiveTokens,
  }) => {
    const theme = useTheme()
    const connectedAccount = useConnectedAccount()
    const convictionFields =
      proposalExecutionStatusFilter === 0
        ? [
            { label: 'Conviction progress', align: 'start' },
            { label: 'Trend', align: 'start' },
          ]
        : []
    const beneficiaryField =
      proposalExecutionStatusFilter === 1
        ? [{ label: 'Beneficiary', align: 'start' }]
        : []
    const linkField =
      proposalExecutionStatusFilter === 1 || !requestToken
        ? [{ label: 'Link', align: 'start' }]
        : []
    const tabs = ['Open Proposals', 'Executed Proposals']
    const requestedField = requestToken
      ? [{ label: 'Requested', align: 'start' }]
      : []
    const statusField = requestToken
      ? [{ label: 'Status', align: 'start' }]
      : []

    const sortedProposals = filteredProposals.sort(
      (a, b) => b.currentConviction - a.currentConviction // desc order
    )

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
            {requestToken && (
              <Tabs
                items={tabs}
                selected={proposalExecutionStatusFilter}
                onChange={handleTabChange}
              />
            )}
            <DataView
              fields={[
                { label: 'Proposal', align: 'start' },
                ...linkField,
                ...requestedField,
                ...convictionFields,
                ...beneficiaryField,
                ...statusField,
              ]}
              statusEmpty={
                <p
                  css={`
                    ${textStyle('title2')};
                    font-weight: 600;
                  `}
                >
                  No proposals yet!
                </p>
              }
              entries={sortedProposals}
              renderEntry={proposal => {
                const entriesElements = [
                  <IdAndTitle
                    id={proposal.id}
                    name={proposal.name}
                    selectProposal={selectProposal}
                  />,
                ]
                if (proposal.executed || !requestToken) {
                  entriesElements.push(
                    <Link href={proposal.link} external>
                      Read more
                    </Link>
                  )
                }
                if (requestToken) {
                  entriesElements.push(
                    <Amount
                      requestedAmount={proposal.requestedAmount}
                      requestToken={requestToken}
                    />
                  )
                }
                if (!proposal.executed) {
                  entriesElements.push(
                    <ProposalInfo
                      proposal={proposal}
                      myStakes={myStakes}
                      stakeToken={stakeToken}
                      requestToken={requestToken}
                    />,
                    <ConvictionTrend proposal={proposal} />
                  )
                }
                if (proposal.executed) {
                  entriesElements.push(
                    <LocalIdentityBadge
                      connectedAccount={addressesEqual(
                        proposal.creator,
                        connectedAccount
                      )}
                      entity={proposal.creator}
                    />
                  )
                }
                if (requestToken) {
                  entriesElements.push(
                    <ConvictionCountdown proposal={proposal} shorter />
                  )
                }
                return entriesElements
              }}
              tableRowHeight={14 * GU}
              heading={
                <FilterBar
                  proposalsSize={filteredProposals.length}
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
            <StakingTokens
              stakeToken={stakeToken}
              myStakes={myStakes}
              myActiveTokens={myActiveTokens}
              totalActiveTokens={totalActiveTokens}
            />
            {requestToken && (
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
            )}
          </div>
        }
        invert="horizontal"
      />
    )
  }
)

const ProposalInfo = ({
  proposal,
  stakeToken,
  myStakes,
  requestToken,
  selectProposal = false,
}) => {
  const myStakeInfo = myStakes.find(stake => stake.proposal === proposal.id)
  return (
    <div
      css={`
        width: ${23 * GU}px;
      `}
    >
      {selectProposal && (
        <IdAndTitle {...proposal} selectProposal={selectProposal} />
      )}
      <ConvictionBar proposal={proposal} withThreshold={requestToken} />
      {myStakeInfo && (
        <Tag>
          {`✓ Supported: ${formatTokenAmount(
            parseInt(myStakeInfo.stakedAmount),
            parseInt(stakeToken.tokenDecimals)
          )} ${stakeToken.tokenSymbol}`}
        </Tag>
      )}
    </div>
  )
}

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
