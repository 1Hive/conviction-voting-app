import React from 'react'
import ReactDOM from 'react-dom'
import { AragonApi } from '@aragon/api-react'
import App from './App'
import { BlockNumberProvider } from './BlockContext'
import { IdentityProvider } from './identity-manager'

const reducer = state => {
  if (state === null) {
    return {
      globalParams: {},
      stakeToken: {},
      requestToken: {},
      proposals: [],
      convictionStakes: [],
      isSyncing: true,
    }
  }
  return state
}

ReactDOM.render(
  <AragonApi reducer={reducer}>
    <IdentityProvider>
      <BlockNumberProvider>
        <App />
      </BlockNumberProvider>
    </IdentityProvider>
  </AragonApi>,
  document.getElementById('root')
)
