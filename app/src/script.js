import 'core-js/stable'
import 'regenerator-runtime/runtime'
import Aragon, { events } from '@aragon/api'
import { hasLoadedTokenSettings, loadTokenSettings } from './token-settings'
import tokenAbi from './abi/minimeToken.json'

const app = new Aragon()

/*
 * Calls `callback` exponentially, everytime `retry()` is called.
 * Returns a promise that resolves with the callback's result if it (eventually) succeeds.
 *
 * Usage:
 *
 * retryEvery(retry => {
 *  // do something
 *
 *  if (condition) {
 *    // retry in 1, 2, 4, 8 seconds… as long as the condition passes.
 *    retry()
 *  }
 * }, 1000, 2)
 *
 */
const retryEvery = async (
  callback,
  { initialRetryTimer = 1000, increaseFactor = 3, maxRetries = 3 } = {}
) => {
  const sleep = time => new Promise(resolve => setTimeout(resolve, time))

  let retryNum = 0
  const attempt = async (retryTimer = initialRetryTimer) => {
    try {
      return await callback()
    } catch (err) {
      if (retryNum === maxRetries) {
        throw err
      }
      ++retryNum

      // Exponentially backoff attempts
      const nextRetryTime = retryTimer * increaseFactor
      console.log(
        `Retrying in ${nextRetryTime}s... (attempt ${retryNum} of ${maxRetries})`
      )
      await sleep(nextRetryTime)
      return attempt(nextRetryTime)
    }
  }

  return attempt()
}

// Get the token address to initialize ourselves
retryEvery(() =>
  app
    .call('stakeToken')
    .toPromise()
    .then(initialize)
    .catch(err => {
      console.error(
        'Could not start background script execution due to the contract not loading the stakeToken:',
        err
      )
      throw err
    })
)

async function initialize(tokenAddress) {
  const token = app.external(tokenAddress, tokenAbi)

  function reducer(state, { event, returnValues, blockNumber }) {
    let nextState = { ...state }

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
  }

  const storeOptions = {
    externals: [{ contract: token }],
    init: initState({ token, tokenAddress }),
  }

  return app.store(reducer, storeOptions)
}

function initState({ token, tokenAddress }) {
  return async cachedState => {
    try {
      const tokenSymbol = await token.symbol().toPromise()
      app.identify(tokenSymbol)
    } catch (err) {
      console.error(
        `Failed to load token symbol for token at ${tokenAddress} due to:`,
        err
      )
    }

    const tokenSettings = hasLoadedTokenSettings(cachedState)
      ? {}
      : await loadTokenSettings(token)

    const inititalState = {
      globalParams: {
        alpha: 0.9,
        maxRatio: 0.2,
        weight: 0.02,
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
      ...cachedState,
      isSyncing: true,
      stakeToken: {
        tokenAddress,
        ...tokenSettings,
      },
    }

    // It's safe to not refresh the balances of all token holders
    // because we process any event that could change balances, even with block caching

    return inititalState
  }
}
