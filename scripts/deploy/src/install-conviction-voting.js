const { ANY_ENTITY, getInstalledApp } = require('@aragon/contract-helpers-test/src/aragon-os')
const { bigExp } = require('@aragon/contract-helpers-test')
const { ZERO_ADDRESS } = require('@aragon/contract-helpers-test/src/addresses')

const GENERIC_ACCOUNT = '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7'
const OWNER_STAKE_TOKENS = bigExp(10000, 18)
const GENERIC_ACCOUNT_STAKE_TOKENS = bigExp(20000, 18)
const VAULT_REQUEST_TOKENS = bigExp(10000, 18)

module.exports = async (artifacts, options = {}) => {
  const convictionVoting = await installConvictionVoting(artifacts, options)
  return { ...options, convictionVoting: { ...options.convictionVoting, proxy: convictionVoting } }
}

async function installConvictionVoting(artifacts, options) {
  let {
    owner, acl, dao, vault, hookedTm, convictionVoting: {
      base, proxy, appId, stakeToken, requestToken, decay, maxRatio, weight, minThresholdStakePercentage
    }
  } = options

  if (proxy) {
    return proxy
  }

  if (!base) {
    console.log(`Deploying ConvictionVoting base...`)
    base = await artifacts.require('ConvictionVoting').new()
    console.log(`ConvictionVoting base: ${ base.address }`)
  }

  if (!stakeToken) {
    console.log(`Deploying Stake Token...`)
    stakeToken = await artifacts.require('MiniMeToken').new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'stakeToken', 18, 'TKN', true)
    console.log(`StakeToken: ${ stakeToken.address }`)

    console.log(`Change stake token controller...`)
    await stakeToken.changeController(hookedTm.address)

    console.log(`Initialize hooked token manager...`)
    await hookedTm.initialize(stakeToken.address, true, 0)

    console.log(`Create Mint Permission...`)
    await createPermissions(acl, hookedTm, ['MINT_ROLE'], owner)

    console.log(`Minting Stake Tokens...`)
    await hookedTm.mint(owner, OWNER_STAKE_TOKENS)
    await hookedTm.mint(GENERIC_ACCOUNT, GENERIC_ACCOUNT_STAKE_TOKENS)
  }

  if (!requestToken) {
    console.log(`Deploying Request Token...`)
    requestToken = await artifacts.require('MiniMeToken').new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'DAI', 18, 'DAI', true)
    await requestToken.generateTokens(vault.address, VAULT_REQUEST_TOKENS)
    console.log(`RequestToken: ${ requestToken.address }`)
  }

  console.log(`Installing ConvictionVoting app...`)
  const receipt = await dao.newAppInstance(appId, base.address, '0x', false, { from: owner })
  const convictionVoting = await base.constructor.at(await getInstalledApp(receipt, appId))
  console.log(`Conviction Voting: ${ convictionVoting.address }`)

  console.log(`Creating ConvictionVoting permissions...`)
  await createPermissions(acl, convictionVoting, ['CREATE_PROPOSALS_ROLE'], ANY_ENTITY, owner)
  await createPermissions(acl, convictionVoting, ['CANCEL_PROPOSAL_ROLE'], owner)
  await createPermissions(acl, hookedTm, ['SET_HOOK_ROLE'], convictionVoting.address, owner)
  await createPermissions(acl, vault, ['TRANSFER_ROLE'], convictionVoting.address, owner)

  console.log(`Initializing ConvictionVoting app...`)
  await convictionVoting.initialize(stakeToken.address, vault.address, requestToken.address, decay, maxRatio, weight, minThresholdStakePercentage)

  return convictionVoting
}

async function createPermissions(acl, app, permissions, to, manager = to) {
  for (const permission of permissions) {
    const ROLE = await app[permission]()
    await acl.createPermission(to, app.address, ROLE, manager, { from: manager })
  }
}
