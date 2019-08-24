import React, { useState } from 'react'
import { useAragonApi } from '@aragon/api-react'
import { Main, Button, Layout, SidePanel, Box, DataView } from '@aragon/ui'
import styled from 'styled-components'
import AppHeader from './components/AppHeader'

function App() {
  const { api, appState } = useAragonApi()
  const { count, syncing } = appState

  const [proposalPanel, setProposalPanel] = useState(false)

  return (
    <div css="min-width: 320px">
      <Main assetsUrl="./">
        <>
          <Layout>
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
                <Box heading="Vault balance">afasfasf</Box>
                <Box heading="My conviction proposal">afasfasf</Box>
              </div>
              <div css="width: 75%">
                <DataView
                  fields={[
                    { label: 'Proposal', priority: 1 },
                    { label: 'Requested', priority: 4 },
                    { label: 'Conviction progress', priority: 2 },
                  ]}
                  entries={[
                    ['asdasd', 'asdasd', 'asdasdasd'],
                    ['asdasd', 'asdasd', 'asdasdasd'],
                    ['asdasd', 'asdasd', 'asdasdasd'],
                  ]}
                  renderEntry={([action, entities, manager], index) => [
                    <div>asdadasd</div>,
                    <div>adsadasd</div>,
                    <div>asdasd</div>,
                  ]}
                  renderEntryChild={([_, entities]) => {
                    console.log(entities)

                    return ['asdasd']
                  }}
                />
              </div>
            </Wrapper>
          </Layout>
          <SidePanel
            title="Create proposal"
            opened={proposalPanel}
            onClose={() => setProposalPanel(false)}
          >
            asdasdad
          </SidePanel>
        </>
      </Main>
    </div>
  )
}

const Wrapper = styled.div`
  display: flex;
`

const Syncing = styled.div.attrs({ children: 'Syncing…' })`
  position: absolute;
  top: 15px;
  right: 20px;
`

export default App
