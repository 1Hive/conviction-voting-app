import React, { useState } from 'react'
import { useAragonApi } from '@aragon/api-react'
import {
  Main,
  Button,
  SidePanel,
  Box,
  DataView,
  useTheme,
  Text,
  Tag,
} from '@aragon/ui'
import styled from 'styled-components'
import AppHeader from './components/AppHeader'
import Balance from './components/Balance'
import ProposalDetail from './components/ProposalDetail'
import AddProposalPanel from './components/AddProposalPanel'
import { ConvictionBar, ConvictionTrend } from './components/ConvictionVisuals'
import { toDecimals } from './lib/math-utils'
import { toHex } from 'web3-utils'

function App() {
  const { api, appState, connectedAccount } = useAragonApi()
  const { proposals, convictionStakes, requestToken } = appState
  const activeProposals = proposals.filter(({ executed }) => !executed)

  const [proposalPanel, setProposalPanel] = useState(false)
  const onProposalSubmit = ({ title, link, amount, beneficiary }) => {
    const decimals = parseInt(requestToken.decimals)
    const decimalAmount = toDecimals(amount.trim(), decimals).toString()
    api.addProposal(title, toHex(link), decimalAmount, beneficiary).toPromise()
    setProposalPanel(false)
  }

  const myStakes =
    (convictionStakes &&
      convictionStakes.filter(({ entity }) => entity === connectedAccount)) ||
    []

  const myLastStake = [...myStakes].pop() || {}

  return (
    <Main assetsUrl="./aragon-ui">
      <>
        <AppHeader
          heading="Conviction Voting"
          action1={
            <Button
              mode="strong"
              label="New proposal"
              onClick={() => setProposalPanel(true)}
            >
              New proposal
            </Button>
          }
        />
        <Wrapper>
          <div css="width: 25%; margin-right: 1rem;">
            <Box heading="Vault balance">
              <Balance {...requestToken} />
            </Box>
            {myLastStake.tokensStaked > 0 && (
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
          <div css="width: 75%">
            <DataView
              fields={[
                { label: 'Proposal', priority: 1 },
                { label: 'Requested', priority: 4 },
                { label: 'Conviction progress', priority: 2 },
                { label: 'Trend', priority: 5 },
              ]}
              entries={activeProposals}
              renderEntry={proposal => [
                <IdAndTitle {...proposal} />,
                <Amount {...proposal} />,
                <ConvictionBar proposal={proposal} />,
                <ConvictionTrend proposal={proposal} />,
              ]}
              renderEntryExpansion={proposal => (
                <ProposalDetail
                  proposal={proposal}
                  onStake={() =>
                    api.stakeAllToProposal(proposal.id).toPromise()
                  }
                  onWithdraw={() =>
                    api.withdrawAllFromProposal(proposal.id).toPromise()
                  }
                  onExecute={() =>
                    api.executeProposal(proposal.id, true).toPromise()
                  }
                />
              )}
            />
          </div>
        </Wrapper>
        <SidePanel
          title="New proposal"
          opened={proposalPanel}
          onClose={() => setProposalPanel(false)}
        >
          <AddProposalPanel onSubmit={onProposalSubmit} />
        </SidePanel>
      </>
    </Main>
  )
}

const IdAndTitle = ({ id, name }) => {
  const theme = useTheme()
  return (
    <div>
      <Text color={theme.surfaceContent.toString()}>#{id}</Text>{' '}
      <Text color={theme.surfaceContentSecondary.toString()}>{name}</Text>
    </div>
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

const ProposalInfo = ({ proposal, stake }) => {
  const {
    appState: {
      stakeToken: { tokenSymbol },
    },
  } = useAragonApi()
  return (
    <div>
      <IdAndTitle {...proposal} />
      <Tag>{`✓ Supported with ${stake.tokensStaked} ${tokenSymbol}`}</Tag>
      <ConvictionBar proposal={proposal} />
    </div>
  )
}

const Wrapper = styled.div`
  display: flex;
`

export default App
