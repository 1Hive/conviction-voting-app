import React from 'react'
import ReactDOM from 'react-dom'
import { AragonApi } from '@aragon/api-react'
import App from './App'
import { IdentityProvider } from './identity-manager'
import reducer from './app-state-reducer.js'

ReactDOM.render(
  <AragonApi reducer={reducer}>
    <IdentityProvider>
      <App />
    </IdentityProvider>
  </AragonApi>,
  document.getElementById('root')
)
