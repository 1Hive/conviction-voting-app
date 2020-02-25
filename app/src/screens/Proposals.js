import React from 'react'
import {
  // Bar,
  DataView,
  // DropDown,
  Link,
  // Tag,
  // GU,
  // textStyle,
  // useLayout,
  useTheme,
  Text,
} from '@aragon/ui'
import { ConvictionBar, ConvictionTrend } from '../components/ConvictionVisuals'
import Balance from '../components/Balance'
import { useAragonApi } from '@aragon/api-react'

const Proposals = React.memo(function Proposals({
  // proposals,
  selectProposal,
  // executionTargets,
  filteredProposals,
  // proposalStatusFilter,
  // handleProposalStatusFilterChange,
}) {
  // const theme = useTheme()
  // const { layoutName } = useLayout()

  return (
    <React.Fragment>
      {/* {layoutName !== 'small' && (
        <Bar>
          <div
            css={`
              height: ${8 * GU}px;
              display: grid;
              grid-template-columns: auto auto auto 1fr;
              grid-gap: ${1 * GU}px;
              align-items: center;
              padding-left: ${3 * GU}px;
            `}
          >
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
                      color: ${theme.info};
                      ${textStyle('label3')};
                    `}
                  >
                    <Tag
                      limitDigits={4}
                      label={proposals.length}
                      size="small"
                    />
                  </span>
                </div>,
                'Open',
                'Closed',
              ]}
              width="128px"
            />
          </div>
        </Bar>
      )} */}
      <DataView
        fields={[
          { label: 'Proposal', priority: 1 },
          { label: 'Requested', priority: 4 },
          { label: 'Conviction progress', priority: 2 },
          { label: 'Trend', priority: 5 },
        ]}
        entries={filteredProposals}
        renderEntry={({ id, name, requestedAmount, ...proposal }) => [
          <IdAndTitle id={id} name={name} selectProposal={selectProposal} />,
          <Amount requestedAmount={requestedAmount} />,
          <ConvictionBar proposal={proposal} />,
          <ConvictionTrend proposal={proposal} />,
        ]}
      />
    </React.Fragment>
  )
})

const IdAndTitle = ({ id, name, selectProposal }) => {
  const theme = useTheme()
  return (
    <Link onClick={() => selectProposal(id)}>
      <Text color={theme.surfaceContent.toString()}>#{id}</Text>{' '}
      <Text color={theme.surfaceContentSecondary.toString()}>{name}</Text>
    </Link>
  )
}

const Amount = ({ requestedAmount = 0 }) => {
  const {
    appState: {
      requestToken: { symbol, decimals, verified },
    },
  } = useAragonApi()
  return (
    <div>
      <Balance
        amount={requestedAmount}
        decimals={decimals}
        symbol={symbol}
        verified={verified}
      />
    </div>
  )
}

export default Proposals
