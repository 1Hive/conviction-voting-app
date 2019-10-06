import React from 'react'
import ReactDOM from 'react-dom'
import { AragonApi } from '@aragon/api-react'
import App from './App'
import { BlockNumberProvider } from './BlockContext'

const reducer = state => {
  if (state === null) {
    return {
      globalParams: {},
      stakeToken: {},
      requestToken: { numData: {} },
      proposals: [],
      convictionStakes: [],
      isSyncing: true,
    }
  }
  return state
}

ReactDOM.render(
  <AragonApi reducer={reducer}>
    <BlockNumberProvider>
      <App />
    </BlockNumberProvider>
  </AragonApi>,
  document.getElementById('root')
)
