import 'core-js/stable'
import 'regenerator-runtime/runtime'
import Aragon, { events } from '@aragon/api'

const app = new Aragon()

app.store(
  async (state, { event, returnValues, blockNumber }) => {
    let nextState = { ...state }

    if (state == null) {
      nextState = {
        globalParams: {
          alpha: 0.9,
          maxRatio: 0.2,
          weight: 0.02,
        },
        stakeToken: {
          name: 'APP Token',
          symbol: 'APP',
          address: '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359',
          numData: {
            decimals: 0,
            supply: 45000,
          },
          verified: true,
        },
        requestToken: {
          name: 'Dai Stablecoin v1.0',
          symbol: 'DAI',
          address: '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359',
          numData: {
            decimals: 18,
            amount: 15000 * Math.pow(10, 18),
          },
          verified: true,
        },
        proposals: [],
        convictionStakes: [],
      }
    }

    switch (event) {
      case 'ProposalAdded': {
        const { entity, id, title, amount, beneficiary } = returnValues
        const newProposal = {
          id: parseInt(id),
          name: title,
          description: 'Lorem ipsum...',
          requestedAmount: parseInt(amount),
          creator: entity,
          beneficiary,
        }
        nextState.proposals.push(newProposal)
        break
      }
      case 'StakeChanged': {
        const {
          entity,
          id,
          tokensStaked,
          totalTokensStaked,
          conviction,
        } = returnValues
        nextState.convictionStakes.push({
          entity,
          proposal: parseInt(id),
          tokensStaked: parseInt(tokensStaked),
          totalTokensStaked: parseInt(totalTokensStaked),
          time: blockNumber,
          conviction: parseInt(conviction),
        })
        break
      }
      case events.SYNC_STATUS_SYNCING:
        nextState = { ...nextState, isSyncing: true }
        break
      case events.SYNC_STATUS_SYNCED:
        nextState = { ...nextState, isSyncing: false }
        break
    }

    console.log(nextState)
    return nextState
  },
  {
    init: null,
  }
)
