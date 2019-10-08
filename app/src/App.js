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
import Balances from './components/Balances'
import BalanceToken from './components/BalanceToken'
import ProposalDetail from './components/ProposalDetail'
import AddProposalPanel from './components/AddProposalPanel'
import { ConvictionBar, ConvictionTrend } from './components/ConvictionVisuals'

function App() {
  const { api, appState, connectedAccount } = useAragonApi()
  const { proposals, convictionStakes, requestToken } = appState
  const activeProposals = proposals.filter(({ executed }) => !executed)
  const balances = requestToken.address ? [requestToken] : []
  const myStakes =
    (convictionStakes &&
      convictionStakes.filter(({ entity }) => entity === connectedAccount)) ||
    []

  const myLastStakes = getLastOf(myStakes, 'proposal').filter(
    ({ tokensStaked }) => tokensStaked > 0
  )

  const isStaked = proposal =>
    myLastStakes.find(stake => stake.proposal === proposal.id)

  const [proposalPanel, setProposalPanel] = useState(false)

  return (
    <Main assetsUrl="./">
      <>
        <AppHeader
          heading="Conviction Voting"
          action1={
            <Button
              mode="strong"
              label="Create proposal"
              onClick={() => setProposalPanel(true)}
            >
              Create proposal
            </Button>
          }
        />
        <Wrapper>
          <div css="width: 25%; margin-right: 1rem;">
            <Box heading="Vault balance">
              <Balances balances={balances} />
            </Box>
            {myLastStakes.length > 0 &&
              myLastStakes.map(stake => (
                <Box heading="My conviction proposal" key={stake.proposal}>
                  <ProposalInfo
                    proposal={
                      proposals.filter(({ id }) => id === stake.proposal)[0]
                    }
                    stake={stake}
                  />
                </Box>
              ))}
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
                  isStaked={isStaked(proposal)}
                />
              )}
            />
          </div>
        </Wrapper>
        <SidePanel
          title="Create proposal"
          opened={proposalPanel}
          onClose={() => setProposalPanel(false)}
        >
          <AddProposalPanel
            onSubmit={({ title, description, amount, beneficiary }) => {
              api.addProposal(title, '0x0', amount, beneficiary).toPromise()
              // TODO Store description on IPFS
              setProposalPanel(false)
            }}
          />
        </SidePanel>
      </>
    </Main>
  )
}

function getLastOf(arr, comp) {
  arr = [...arr].reverse()
  const unique = arr
    .map(e => e[comp])
    // store the keys of the unique objects
    .map((e, i, final) => final.indexOf(e) === i && i)
    // eliminate the dead keys & store unique objects
    .filter(e => arr[e])
    .map(e => arr[e])
  return unique
}

const IdAndTitle = ({ id, name, description }) => {
  const theme = useTheme()
  return (
    <div>
      <Text color={theme.surfaceContent.toString()}>#{id}</Text>{' '}
      <Text color={theme.surfaceContentSecondary.toString()}>{name}</Text>
      <br />
      <Text color={theme.surfaceContentSecondary.toString()}>
        {description}
      </Text>
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
      <BalanceToken
        amount={requestedAmount / 10 ** decimals}
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
