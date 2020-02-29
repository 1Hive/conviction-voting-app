import React, { useCallback } from 'react'
import { useGuiStyle, useAppState } from '@aragon/api-react'
import {
  Main,
  Button,
  SidePanel,
  SyncIndicator,
  IconPlus,
  Header,
  GU,
  useLayout,
} from '@aragon/ui'
import styled from 'styled-components'

import ProposalDetail from './screens/ProposalDetail'
import Proposals from './screens/Proposals'
import AddProposalPanel from './components/AddProposalPanel'

import useAppLogic from './app-logic'
import useFilterProposals from './hooks/useFilterProposals'
import useSelectedProposal from './hooks/useSelectedProposal'

const Layout = styled.div`
  display: flex;
  justify-content: center;
  margin-top: ${2.5 * GU}px;
`

const App = React.memo(function App() {
  const { setProposalPanel, proposalPanel, onProposalSubmit } = useAppLogic()

  const { proposals = [], isSyncing, requestToken } = useAppState()

  const { layoutName } = useLayout()
  const compactMode = layoutName === 'small'

  const [selectedProposal, selectProposal] = useSelectedProposal(proposals)
  const handleBack = useCallback(() => selectProposal(-1), [selectProposal])
  const {
    filteredProposals,
    proposalStatusFilter,
    handleProposalStatusFilterChange,
  } = useFilterProposals(proposals)

  return (
    <Layout size={layoutName}>
      <div
        css={`
          width: ${layoutName !== 'small' ? '75%' : '100%'};
        `}
      >
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
        {selectedProposal ? (
          <ProposalDetail
            proposal={selectedProposal}
            onBack={handleBack}
            requestToken={requestToken}
          />
        ) : (
          <Proposals
            proposals={proposals}
            selectProposal={selectProposal}
            filteredProposals={filteredProposals}
            proposalStatusFilter={proposalStatusFilter}
            handleProposalStatusFilterChange={handleProposalStatusFilterChange}
            requestToken={requestToken}
          />
        )}
      </div>
      <SidePanel
        title="New proposal"
        opened={proposalPanel}
        onClose={() => setProposalPanel(false)}
      >
        <AddProposalPanel onSubmit={onProposalSubmit} />
      </SidePanel>
    </Layout>
  )
})

export default () => {
  const { appearance } = useGuiStyle()
  return (
    <Main layout={false} theme={appearance} assetsUrl="./aragon-ui">
      <App />
    </Main>
  )
}
