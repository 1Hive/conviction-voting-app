import 'core-js/stable'
import 'regenerator-runtime/runtime'
import { of } from 'rxjs'
import AragonApi from '@aragon/api'

const INITIALIZATION_TRIGGER = Symbol('INITIALIZATION_TRIGGER')

const api = new AragonApi()

const mockState = {
  proposals: [
    {
      id: 1,
      name: 'Aragon Sidechain',
      description: 'Lorem ipsum...',
      requestedToken: 'DAI', // token address?
      requestedAmount: 1500,
      stakedConviction: 0.57,
      neededConviction: 0.72,
      creator: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
      recipient: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
    },
    {
      id: 2,
      name: 'Conviction Voting',
      description: 'Lorem ipsum...',
      requestedToken: 'DAI', // token address?
      requestedAmount: 500,
      stakedConviction: 0.57,
      neededConviction: 0.72,
      creator: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
      recipient: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
    },
  ],
  myStake: {
    proposal: 2,
    stakedTokens: 33,
    stakedConviction: 0.25,
  },
}

api.store(
  async (state, event) => {
    let newState

    switch (event.event) {
      case INITIALIZATION_TRIGGER:
        newState = mockState
        console.log(newState)
        break
      case 'Increment':
        newState = { count: await getValue() }
        break
      case 'Decrement':
        newState = { count: await getValue() }
        break
      default:
        newState = state
    }

    return newState
  },
  [
    // Always initialize the store with our own home-made event
    of({ event: INITIALIZATION_TRIGGER }),
  ]
)

async function getValue() {
  return parseInt(await api.call('value').toPromise(), 10)
}
