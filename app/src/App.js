import React, { useState } from 'react'
import { useAragonApi, useGuiStyle } from '@aragon/api-react'
import {
  Main,
  Button,
  SidePanel,
  Box,
  Tag,
  SyncIndicator,
  IconPlus,
  Header,
  useLayout,
} from '@aragon/ui'
import styled from 'styled-components'
// import ProposalDetail from './components/ProposalDetail'
import AddProposalPanel from './components/AddProposalPanel'
import Balance from './components/Balance'
import useAppLogic from './app-logic'
import { toDecimals } from './lib/math-utils'
import { toHex } from 'web3-utils'
import Proposals from './screens/Proposals'

const App = React.memo(function App() {
  const {
    isSyncing,
    selectProposal,
    selectedProposal,
    proposals,
  } = useAppLogic()

  const { layoutName } = useLayout()
  const compactMode = layoutName === 'small'

  const { api, appState, connectedAccount } = useAragonApi()
  const { convictionStakes, requestToken } = appState
  const filteredProposals = proposals.filter(({ executed }) => !executed)

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
    <React.Fragment>
      <SyncIndicator visible={isSyncing} />
      <Header
        primary="Conviction Voting"
        secondary={
          !selectedProposal && (
            <Button
              mode="strong"
              onClick={() => setProposalPanel(true)}
              label="New proposal"
              icon={<IconPlus />}
              display={compactMode ? 'icon' : 'label'}
            />
          )
        }
      />
      <Wrapper>
        <div css="width: 25%; margin-right: 1rem;">
          <Box heading="Vault balance">
            <Balance {...requestToken} />
          </Box>
          {/* {myLastStake.tokensStaked > 0 && (
            <Box heading="My staked proposal" key={myLastStake.proposal}>
              <ProposalInfo
                proposal={
                  proposals.filter(({ id }) => id === myLastStake.proposal)[0]
                }
                stake={myLastStake}
              />
            </Box>
          )} */}
        </div>
        <div css="width: 75%">
          <Proposals
            filteredProposals={filteredProposals}
            selectProposal={selectProposal}
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
    </React.Fragment>
  )
})

// const ProposalInfo = ({ proposal, stake }) => {
//   const {
//     appState: {
//       stakeToken: { tokenSymbol },
//     },
//   } = useAragonApi()
//   return (
//     <div>
//       <IdAndTitle {...proposal} />
//       <Tag>{`✓ Supported with ${stake.tokensStaked} ${tokenSymbol}`}</Tag>
//       <ConvictionBar proposal={proposal} />
//     </div>
//   )
// }

const Wrapper = styled.div`
  display: flex;
`

export default () => {
  const { appearance } = useGuiStyle()
  return (
    <Main theme={appearance} assetsUrl="./aragon-ui">
      <App />
    </Main>
  )
}
