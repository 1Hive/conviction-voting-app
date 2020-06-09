import { toUtf8 } from './web3-utils'
import { round } from './math-utils'
import tokenSymbolAbi from '../abi/token-symbol.json'
import tokenSymbolBytesAbi from '../abi/token-symbol-bytes.json'
import tokenNameAbi from '../abi/token-name.json'
import tokenNameBytesAbi from '../abi/token-name-bytes.json'

const ANT_MAINNET_TOKEN_ADDRESS = '0x960b236A07cf122663c4303350609A66A7B288C0'
const DAI_MAINNET_TOKEN_ADDRESS = '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359'
export const ETHER_TOKEN_FAKE_ADDRESS =
  '0x0000000000000000000000000000000000000000'

// "Important" tokens the Finance app should prioritize
const PRESET_TOKENS = new Map([
  [
    'main',
    [
      ETHER_TOKEN_FAKE_ADDRESS,
      ANT_MAINNET_TOKEN_ADDRESS,
      DAI_MAINNET_TOKEN_ADDRESS,
    ],
  ],
])

// Some known tokens don’t strictly follow ERC-20 and it would be difficult to
// adapt to every situation. The data listed in this map is used as a fallback
// if either some part of their interface doesn't conform to a standard we
// support.
const KNOWN_TOKENS_FALLBACK = new Map([
  [
    'main',
    new Map([
      [
        DAI_MAINNET_TOKEN_ADDRESS,
        { symbol: 'DAI', name: 'Dai Stablecoin v1.0', decimals: '18' },
      ],
    ]),
  ],
])

export const tokenDataFallback = (tokenAddress, fieldName, networkType) => {
  // The fallback list is without checksums
  const addressWithoutChecksum = tokenAddress.toLowerCase()

  const fallbacksForNetwork = KNOWN_TOKENS_FALLBACK.get(networkType)
  if (
    fallbacksForNetwork == null ||
    !fallbacksForNetwork.has(addressWithoutChecksum)
  ) {
    return null
  }
  return fallbacksForNetwork.get(addressWithoutChecksum)[fieldName] || null
}

export async function getTokenSymbol(app, address) {
  // Symbol is optional; note that aragon.js doesn't return an error (only an falsey value) when
  // getting this value fails
  let tokenSymbol
  try {
    const token = app.external(address, tokenSymbolAbi)
    tokenSymbol = await token.symbol().toPromise()
  } catch (err) {
    // Some tokens (e.g. DS-Token) use bytes32 as the return type for symbol().
    const token = app.external(address, tokenSymbolBytesAbi)
    tokenSymbol = toUtf8(await token.symbol().toPromise())
  }

  return tokenSymbol || null
}

export async function getTokenName(app, address) {
  // Name is optional; note that aragon.js doesn't return an error (only an falsey value) when
  // getting this value fails
  let tokenName
  try {
    const token = app.external(address, tokenNameAbi)
    tokenName = await token.name().toPromise()
  } catch (err) {
    // Some tokens (e.g. DS-Token) use bytes32 as the return type for name().
    const token = app.external(address, tokenNameBytesAbi)
    tokenName = toUtf8(await token.name().toPromise())
  }

  return tokenName || null
}

export function getPresetTokens(networkType) {
  return PRESET_TOKENS.get(networkType) || [ETHER_TOKEN_FAKE_ADDRESS]
}

export function formatDecimals(value, digits) {
  try {
    return value.toLocaleString('en-US', {
      style: 'decimal',
      maximumFractionDigits: digits,
    })
  } catch (err) {
    if (err.name === 'RangeError') {
      // Fallback to Number.prototype.toString()
      // if the language tag is not supported.
      return value.toString()
    }
    throw err
  }
}

export function formatTokenAmount(
  amount,
  decimals = 0,
  isIncoming,
  displaySign = false,
  { rounding = 2, commas = true, replaceZeroBy = '0' } = {}
) {
  const roundedAmount = round(amount / Math.pow(10, decimals), rounding)
  const formattedAmount = formatDecimals(roundedAmount, 18)

  if (formattedAmount === '0') {
    return replaceZeroBy
  }

  return (
    (displaySign ? (isIncoming ? '+' : '-') : '') +
    (commas ? formattedAmount : formattedAmount.replace(',', ''))
  )
}
