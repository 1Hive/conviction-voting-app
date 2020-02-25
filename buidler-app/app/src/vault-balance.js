import { addressesEqual } from './lib/web3-utils'
import {
  ETHER_TOKEN_FAKE_ADDRESS,
  getTokenSymbol,
  getTokenName,
  tokenDataFallback,
} from './lib/token-utils'
import { first } from 'rxjs/operators'

import tokenDecimalsAbi from './abi/token-decimals.json'
import tokenNameAbi from './abi/token-name.json'
import tokenSymbolAbi from './abi/token-symbol.json'
import vaultBalanceAbi from './abi/vault-balance.json'
import vaultGetInitializationBlockAbi from './abi/vault-getinitializationblock.json'
import vaultEventAbi from './abi/vault-events.json'

export async function getVaultInitializationBlock(vault) {
  try {
    return await vault.getInitializationBlock().toPromise()
  } catch (err) {
    console.error("Could not get attached vault's initialization block:", err)
  }
}

const tokenAbi = [].concat(tokenDecimalsAbi, tokenNameAbi, tokenSymbolAbi)
export const vaultAbi = [].concat(
  vaultBalanceAbi,
  vaultGetInitializationBlockAbi,
  vaultEventAbi
)

const tokenContracts = new Map() // Addr -> External contract
const tokenDecimals = new Map() // External contract -> decimals
const tokenNames = new Map() // External contract -> name
const tokenSymbols = new Map() // External contract -> symbol

const ETH_CONTRACT = Symbol('ETH_CONTRACT')

async function getSettings(app, vault) {
  const network = await app
    .network()
    .pipe(first())
    .toPromise()
  const settings = {
    network,
    ethToken: {
      address: ETHER_TOKEN_FAKE_ADDRESS,
    },
    vault,
  }
  return settings
}

// Set up ETH placeholders
tokenContracts.set(ETHER_TOKEN_FAKE_ADDRESS, ETH_CONTRACT)
tokenDecimals.set(ETH_CONTRACT, '18')
tokenNames.set(ETH_CONTRACT, 'Ether')
tokenSymbols.set(ETH_CONTRACT, 'ETH')

export async function updateBalances(balances, tokenAddress, app, vault) {
  const newBalances = Array.from(balances || [])
  const settings = await getSettings(app, vault)
  tokenAddress = tokenAddress || settings.ethToken.address

  const tokenContract = tokenContracts.has(tokenAddress)
    ? tokenContracts.get(tokenAddress)
    : app.external(tokenAddress, tokenAbi)
  tokenContracts.set(tokenAddress, tokenContract)

  const balancesIndex = newBalances.findIndex(({ address }) =>
    addressesEqual(address, tokenAddress)
  )
  if (balancesIndex === -1) {
    return newBalances.concat(
      await newBalanceEntry(tokenContract, tokenAddress, settings, app)
    )
  } else {
    newBalances[balancesIndex] = {
      ...newBalances[balancesIndex],
      amount: await loadTokenBalance(tokenAddress, settings),
    }
    return newBalances
  }
}

async function newBalanceEntry(tokenContract, tokenAddress, settings, app) {
  const [balance, decimals, name, symbol] = await Promise.all([
    loadTokenBalance(tokenAddress, settings),
    loadTokenDecimals(tokenContract, tokenAddress, settings),
    loadTokenName(tokenContract, tokenAddress, settings, app),
    loadTokenSymbol(tokenContract, tokenAddress, settings, app),
  ])

  return {
    decimals,
    name,
    symbol,
    address: tokenAddress,
    amount: balance,
    verified: true,
  }
}

function loadTokenBalance(tokenAddress, { vault }) {
  return vault.contract.balance(tokenAddress).toPromise()
}

async function loadTokenDecimals(tokenContract, tokenAddress, { network }) {
  if (tokenDecimals.has(tokenContract)) {
    return tokenDecimals.get(tokenContract)
  }

  const fallback =
    tokenDataFallback(tokenAddress, 'decimals', network.type) || '0'

  let decimals
  try {
    decimals = (await tokenContract.decimals().toPromise()) || fallback
    tokenDecimals.set(tokenContract, decimals)
  } catch (err) {
    // decimals is optional
    decimals = fallback
  }
  return decimals
}

async function loadTokenName(tokenContract, tokenAddress, { network }, app) {
  if (tokenNames.has(tokenContract)) {
    return tokenNames.get(tokenContract)
  }
  const fallback = tokenDataFallback(tokenAddress, 'name', network.type) || ''

  let name
  try {
    name = (await getTokenName(app, tokenAddress)) || fallback
    tokenNames.set(tokenContract, name)
  } catch (err) {
    // name is optional
    name = fallback
  }
  return name
}

async function loadTokenSymbol(tokenContract, tokenAddress, { network }, app) {
  if (tokenSymbols.has(tokenContract)) {
    return tokenSymbols.get(tokenContract)
  }
  const fallback = tokenDataFallback(tokenAddress, 'symbol', network.type) || ''

  let symbol
  try {
    symbol = (await getTokenSymbol(app, tokenAddress)) || fallback
    tokenSymbols.set(tokenContract, symbol)
  } catch (err) {
    // symbol is optional
    symbol = fallback
  }
  return symbol
}
