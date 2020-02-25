let appManager, user, anyAcc
let stakeToken, requestToken
let vault

module.exports = {
  postDao: async function(dao, bre) {
    await _getAccounts(bre.web3)
    await _deployTokens(bre.artifacts)
    await _deployVault()
    await _transferTokens()
  },

  getInitParams: async function(bre) {
    return [
      stakeToken.address,
      vault.address,
      requestToken.address,
      9, /* decay */
      2, /* max ratio */
      2  /* weight */
    ]
  }
}

async function _deployVault() {
  const VaultMock = artifacts.require('VaultMock')

  vault = await VaultMock.new({ from: appManager })
  console.log(`> Vault deployed: ${vault.address}`)
}

async function _transferTokens() {
  await stakeToken.transfer(appManager, 30000, { from: anyAcc })
  await stakeToken.transfer(user, 15000, { from: anyAcc })

  await requestToken.transfer(vault.address, 15000, { from: appManager })
}

async function _deployTokens(artifacts) {
  stakeToken = await _deployToken('stakeToken', 'TKN', 1, 4500, anyAcc, artifacts)
  console.log(`> Stake token deployed: ${stakeToken.address}`)

  requestToken = await _deployToken('DAI', 'DAI', 18, 100000, appManager, artifacts)
  console.log(`> Request token deployed: ${requestToken.address}`)
}

async function _deployToken(tokenName, tokenSymbol, decimals, initialSupply, fromAccount, artifacts) {
  const ERC20Mock = artifacts.require('ERC20Mock')

  return await ERC20Mock.new(tokenName, tokenSymbol, decimals, initialSupply, {
    from: fromAccount,
  })
}

async function _getAccounts(web3) {
  ([appManager, user, anyAcc] = await web3.eth.getAccounts())
}
