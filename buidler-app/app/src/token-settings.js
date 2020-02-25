const tokenSettings = [
  ['decimals', 'tokenDecimals', 'bignumber'],
  ['symbol', 'tokenSymbol', 'string'],
  ['name', 'tokenName', 'string'],
  ['totalSupply', 'tokenSupply', 'bignumber'],
  ['transfersEnabled', 'tokenTransfersEnabled', 'bool'],
]

export function hasLoadedTokenSettings(state) {
  state = state || {}
  return tokenSettings.reduce(
    // Use null check as totalSupply may be 0
    (loaded, [_, key]) => loaded && state[key] != null,
    true
  )
}

export function loadTokenSettings(token) {
  return Promise.all(
    tokenSettings.map(([name, key]) =>
      token[name]()
        .toPromise()
        .then(value => ({ [key]: value }))
    )
  )
    .then(settings =>
      settings.reduce((acc, setting) => ({ ...acc, ...setting }), {})
    )
    .catch(err => {
      console.error("Failed to load token's settings", err)
      // Return an empty object to try again later
      return {}
    })
}

export default tokenSettings
