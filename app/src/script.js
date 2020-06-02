import 'core-js/stable'
import 'regenerator-runtime/runtime'
import Aragon, { events } from '@aragon/api'
import { addressesEqual, toUtf8 } from './lib/web3-utils'
import { hasLoadedTokenSettings, loadTokenSettings } from './token-settings'
import tokenAbi from './abi/minimeToken.json'
import {
  vaultAbi,
  getVaultInitializationBlock,
  updateBalances,
} from './vault-balance'

const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

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

// Get the token addresses and vault to initialize ourselves
retryEvery(() =>
  Promise.all([
    app.call('stakeToken').toPromise(),
    app.call('vault').toPromise(),
    app.call('requestToken').toPromise(),
  ])
    .then(initialize)
    .catch(err => {
      console.error(
        'Could not start background script execution due to the contract not loading the stakeToken, vault, or requestToken:',
        err
      )
      throw err
    })
)

async function initialize([
  stakeTokenAddress,
  vaultAddress,
  requestTokenAddress,
]) {
  const stakeToken = {
    contract: app.external(stakeTokenAddress, tokenAbi),
    address: stakeTokenAddress,
  }
  const vault = vaultAddress !== ZERO_ADDR && {
    contract: app.external(vaultAddress, vaultAbi),
    address: vaultAddress,
  }

  async function reducer(state, { event, returnValues, blockNumber, address }) {
    console.log(event, returnValues)
    let nextState = { ...state }

    if (addressesEqual(address, stakeTokenAddress)) {
      switch (event) {
        case 'Transfer':
          const tokenSupply = await stakeToken.contract
            .totalSupply()
            .toPromise()
          nextState = {
            ...nextState,
            stakeToken: {
              ...nextState.stakeToken,
              tokenSupply,
            },
          }
          return nextState
        default:
          return nextState
      }
    }

    // Vault event
    if (
      vaultAddress !== ZERO_ADDR &&
      addressesEqual(address, vaultAddress) &&
      returnValues.token === requestTokenAddress
    ) {
      return {
        ...nextState,
        requestToken: await getRequestTokenSettings(returnValues.token, vault),
      }
    }

    switch (event) {
      case 'ProposalAdded': {
        const { entity, id, title, amount, beneficiary, link } = returnValues
        const newProposal = {
          id: parseInt(id),
          name: title,
          link: link && toUtf8(link), // Can be an HTTP or IPFS link
          requestedAmount: parseInt(amount),
          creator: entity,
          beneficiary,
        }
        nextState = {
          ...nextState,
          proposals: [...nextState.proposals, newProposal],
        }
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
      case 'ProposalExecuted': {
        const { id } = returnValues
        nextState = {
          ...nextState,
          proposals: nextState.proposals.map(proposal => {
            if (proposal.id === parseInt(id)) {
              return { ...proposal, executed: true }
            }
            return proposal
          }),
        }
        break
      }
      case events.SYNC_STATUS_SYNCING:
        nextState = { ...nextState, isSyncing: true }
        break
      case events.SYNC_STATUS_SYNCED:
        nextState = { ...nextState, isSyncing: false }
        break
      case events.ACCOUNTS_TRIGGER: {
        const { account } = returnValues
        nextState = {
          ...nextState,
          stakeToken: {
            ...nextState.stakeToken,
            balance: account
              ? await stakeToken.contract.balanceOf(account).toPromise()
              : 0,
          },
        }
      }
    }

    return nextState
  }

  const storeOptions = {
    externals: vault
      ? [
          { contract: stakeToken.contract, initializationBlock: 0 },
          {
            contract: vault.contract,
            initializationBlock: await getVaultInitializationBlock(
              vault.contract
            ),
          },
        ]
      : [{ contract: stakeToken.contract, initializationBlock: 0 }],
    init: initState(stakeToken, vault, requestTokenAddress),
  }

  return app.store(reducer, storeOptions)
}

function initState(stakeToken, vault, requestTokenAddress) {
  return async cachedState => {
    const globalParams =
      (cachedState && cachedState.globalParams) || (await loadGlobalParams())

    const stakeTokenSettings = hasLoadedTokenSettings(cachedState)
      ? cachedState.stakeTokenSettings
      : await loadTokenSettings(stakeToken.contract)

    const requestTokenSettings =
      vault && (await getRequestTokenSettings(requestTokenAddress, vault))

    if (vault) {
      app.identify(
        `${stakeTokenSettings.tokenSymbol}-${requestTokenSettings.symbol}`
      )
    } else {
      app.identify(`${stakeTokenSettings.tokenSymbol}`)
    }

    const inititalState = {
      proposals: [],
      convictionStakes: [],
      ...cachedState,
      globalParams,
      stakeToken: stakeTokenSettings,
      requestToken: requestTokenSettings,
      isSyncing: true,
    }
    return inititalState
  }
}

async function getRequestTokenSettings(address, vault) {
  return (
    { ...(await updateBalances([], address, app, vault))[0], address } || {}
  )
}

async function loadGlobalParams() {
  const [decay, maxRatio, weight, D] = await Promise.all([
    app.call('decay').toPromise(),
    app.call('maxRatio').toPromise(),
    app.call('weight').toPromise(),
    app.call('D').toPromise(),
  ])
  return {
    alpha: parseInt(decay) / D,
    maxRatio: parseInt(maxRatio) / D,
    weight: parseInt(weight) / D,
  }
}
