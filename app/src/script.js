import 'core-js/stable'
import 'regenerator-runtime/runtime'
import { of } from 'rxjs'
import AragonApi from '@aragon/api'

const INITIALIZATION_TRIGGER = Symbol('INITIALIZATION_TRIGGER')

const api = new AragonApi()

const mockEvents = [
  {
    event: 'ProposalAdded',
    returnValues: {
      entity: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
      id: 1,
      title: 'Aragon Sidechain',
      amount: 2000,
      beneficiary: '0xD41b2558691d4A39447b735C23E6c98dF6cF4409',
    },
  },
  {
    event: 'ProposalAdded',
    returnValues: {
      entity: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
      id: 2,
      title: 'Conviction Voting',
      amount: 1000,
      beneficiary: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
    },
  },
  {
    event: 'Staked',
    returnValues: {
      entity: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
      id: 1,
      time: 20,
      tokensStaked: 1000,
      conviction: 0,
    },
  },
  {
    event: 'Withdrawn',
    returnValues: {
      entity: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
      id: 1,
      time: 50,
      tokensStaked: 0,
      conviction: 0,
    },
  },
  {
    event: 'Staked',
    returnValues: {
      entity: '0xD41b2558691d4A39447b735C23E6c98dF6cF4409',
      id: 1,
      time: 30,
      tokensStaked: 1000,
      conviction: 0,
    },
  },
  {
    event: 'Staked',
    returnValues: {
      entity: '0xD41b2558691d4A39447b735C23E6c98dF6cF4409',
      id: 1,
      time: 60,
      tokensStaked: 7000,
      conviction: 0,
    },
  },
]

api.store(
  async (state, { event, returnValues }) => {
    let newState

    switch (event) {
      case INITIALIZATION_TRIGGER:
        newState = {
          alpha: 90,
          funds: 15000,
          supply: 45000,
          proposals: [],
          convictionStakes: [],
        }
        break
      case 'ProposalAdded': {
        const { entity, id, title, amount, beneficiary } = returnValues
        const newProposal = {
          id,
          name: title,
          description: 'Lorem ipsum...',
          requestedToken: 'DAI', // token address?
          requestedAmount: parseInt(amount),
          stakedConviction: 0.57,
          neededConviction: 0.72,
          creator: entity,
          beneficiary,
        }
        newState = { ...state, proposals: [...state.proposals, newProposal] }
        break
      }
      case 'Staked':
      case 'Withdrawn': {
        const { entity, id, tokensStaked, time } = returnValues
        newState = {
          ...state,
          convictionStakes: [
            ...state.convictionStakes,
            {
              entity,
              proposal: parseInt(id),
              tokensStaked: parseInt(tokensStaked),
              time, // ?
            },
          ],
        }
        break
      }
      default:
        newState = state
    }

    console.log(newState)
    return newState
  },
  [
    // Always initialize the store with our own home-made event
    of({ event: INITIALIZATION_TRIGGER }, ...mockEvents),
  ]
)
