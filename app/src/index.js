import React from 'react'
import ReactDOM from 'react-dom'
import BN from 'bn.js'
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

  const { convictionStakes, stakeToken } = state
  return {
    ...state,
    stakeToken: {
      ...stakeToken,
      tokenDecimals: parseInt(stakeToken.tokenDecimals),
      balanceBN: new BN(stakeToken.balance),
    },
    convictionStakes: convictionStakes.map(({ tokensStaked, ...stake }) => ({
      ...stake,
      tokensStaked,
      tokensStakedBN: new BN(String(tokensStaked)),
    })),
  }
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
