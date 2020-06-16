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
    const nextState = { ...state }

    if (addressesEqual(address, stakeTokenAddress)) {
      switch (event) {
        case 'Transfer':
          return onNewTransfer(nextState, stakeToken.contract)
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
      case events.SYNC_STATUS_SYNCING:
        return { ...nextState, isSyncing: true }
      case events.SYNC_STATUS_SYNCED:
        return { ...nextState, isSyncing: false }
      case events.ACCOUNTS_TRIGGER:
        return onUpdatedAccount(nextState, returnValues, stakeToken.contract)
      case 'ProposalAdded':
        return onNewProposal(nextState, returnValues)
      case 'StakeAdded':
        return onStakeUpdated(nextState, returnValues, blockNumber)
      case 'StakeWithdrawn':
        return onStakeUpdated(nextState, returnValues, blockNumber)
      case 'ProposalExecuted':
        return onProposalExecuted(nextState, returnValues)
      default:
        return nextState
    }
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

/***********************
 *                     *
 *   Event Handlers    *
 *                     *
 ***********************/

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

// Conviction Voting events //
async function onUpdatedAccount(state, { account }, stakeTokenContract) {
  const accountBalance = account
    ? await stakeTokenContract.balanceOf(account).toPromise()
    : 0

  return {
    ...state,
    stakeToken: {
      ...state.stakeToken,
      balance: accountBalance,
    },
  }
}

function onNewProposal(state, returnValues) {
  const { entity, id, title, amount, beneficiary, link } = returnValues

  const newProposal = {
    id: parseInt(id),
    name: title,
    link: link && toUtf8(link), // Can be an HTTP or IPFS link
    requestedAmount: amount,
    creator: entity,
    beneficiary,
    stakes: [],
  }
  return {
    ...state,
    proposals: [...state.proposals, newProposal],
  }
}

function onStakeUpdated(
  { proposals, convictionStakes, ...state },
  returnValues,
  blockNumber
) {
  const { entity, id, tokensStaked } = returnValues

  const updatedProposals = proposals.map(proposal => {
    if (proposal.id === parseInt(id)) {
      const updatedStakes = updateProposalStakes(
        proposal.stakes,
        entity,
        tokensStaked
      )
      return { ...proposal, stakes: updatedStakes }
    }

    return proposal
  })

  const updatedConvictionStakes = updateConvictionStakes(
    convictionStakes,
    returnValues,
    blockNumber
  )

  return {
    ...state,
    convictionStakes: updatedConvictionStakes,
    proposals: updatedProposals,
  }
}

function onProposalExecuted(state, { id }) {
  return {
    ...state,
    proposals: state.proposals.map(proposal => {
      if (proposal.id === parseInt(id)) {
        return { ...proposal, executed: true }
      }
      return proposal
    }),
  }
}

// Stake token events //
async function onNewTransfer(state, stakeTokenContract) {
  const tokenSupply = await stakeTokenContract.totalSupply().toPromise()

  return {
    ...state,
    stakeToken: {
      ...state.stakeToken,
      tokenSupply,
    },
  }
}

/***********************
 *                     *
 *       Helpers       *
 *                     *
 ***********************/

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
    decay,
    maxRatio,
    weight,
    pctBase: D,
  }
}

function updateProposalStakes(stakes, entity, newTokensStaked) {
  const index = stakes.findIndex(stake => addressesEqual(stake.entity, entity))

  if (index === -1) {
    return [...stakes, { entity, amount: newTokensStaked }]
  }

  const updatedStake = { ...stakes[index], amount: newTokensStaked }

  return [...stakes.slice(0, index), updatedStake, ...stakes.slice(index + 1)]
}

function updateConvictionStakes(convictionStakes, returnValues, blockNumber) {
  const {
    entity,
    id,
    tokensStaked,
    totalTokensStaked,
    conviction,
  } = returnValues

  const newStake = {
    entity,
    proposal: parseInt(id),
    tokensStaked,
    totalTokensStaked,
    time: blockNumber,
    conviction,
  }

  return [...convictionStakes, newStake]
}
