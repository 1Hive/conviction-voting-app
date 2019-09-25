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
import { useBlockNumber } from './BlockContext'

function App() {
  const { api, appState, connectedAccount } = useAragonApi()
  const { proposals, convictionStakes } = appState
  const myStakes =
    (convictionStakes &&
      convictionStakes.filter(({ entity }) => entity === connectedAccount)) ||
    []

  const myLastStakes = getLastOf(myStakes, 'proposal').filter(
    ({ tokensStaked }) => tokensStaked > 0
  )

  const isStaked = proposal =>
    myLastStakes.find(stake => stake.proposal === proposal.id)

  const balances = [
    {
      name: 'Dai Stablecoin v1.0',
      symbol: 'DAI',
      address: '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359',
      numData: {
        decimals: 18,
        amount: 10000 * Math.pow(10, 18),
      },
      verified: true,
    },
  ]

  const [proposalPanel, setProposalPanel] = useState(false)

  const blockNumber = useBlockNumber()

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
        <p>Current block: {blockNumber}</p>
        <Wrapper>
          <div css="width: 25%; margin-right: 1rem;">
            <Box heading="Vault balance">
              <Balances balances={balances} />
            </Box>
            {myLastStakes.length > 0 &&
              myLastStakes.map(stake => (
                <Box heading="My conviction proposal">
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
              entries={proposals}
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

const Amount = ({ requestedAmount = 0, requestedToken = 'DAI' }) => (
  <div>
    <BalanceToken
      amount={parseInt(requestedAmount)}
      symbol={requestedToken}
      verified
    />
  </div>
)

const ProposalInfo = ({ proposal, stake }) => {
  return (
    <div>
      <IdAndTitle {...proposal} />
      <Tag>{`✓ Voted with ${stake.tokensStaked} TKN`}</Tag>
      <ConvictionBar proposal={proposal} />
    </div>
  )
}

const Wrapper = styled.div`
  display: flex;
`

export default App
