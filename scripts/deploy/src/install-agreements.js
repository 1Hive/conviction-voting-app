const { getInstalledApp } = require('@aragon/contract-helpers-test/src/aragon-os')

module.exports = async (options = {}) => {
  const agreement = await installAgreement(options)
  await activateVoting(agreement, options)
  return { ...options, agreement: { ...options.agreement, proxy: agreement}}
}

async function installAgreement(options) {
  if (options.agreement.proxy) {
    return options.agreement.proxy
  }

  const { owner, acl, dao, agreement: { base, appId, title, content }, arbitrator, stakingFactory, aragonAppFeesCashier } = options
  console.log(`\nInstalling Agreement app...`)
  const receipt = await dao.newAppInstance(appId, base.address, '0x', false, { from: owner })
  const agreement = await base.constructor.at(getInstalledApp(receipt, appId))

  console.log(`Creating Agreement permissions...`)
  await createPermissions(acl, agreement, ['CHANGE_AGREEMENT_ROLE', 'MANAGE_DISPUTABLE_ROLE'], owner)

  console.log(`Initializing Agreement app...`)
  await agreement.initialize(title, content, arbitrator.address, aragonAppFeesCashier.address, stakingFactory.address)
  console.log(`Agreement proxy: ${agreement.address}`)
  return agreement
}

async function activateVoting(agreement, options) {
  const { owner, acl, feeToken, convictionVoting: { proxy, actionCollateral, challengeCollateral, challengeDuration } } = options

  if ((await agreement.getDisputableInfo(proxy.address)).activated) {
    console.log('Conviction voting already activated')
    return
  }

  console.log(`Activating ConvictionVoting app with Agreement...`)
  await createPermissions(acl, proxy, ['SET_AGREEMENT_ROLE'], agreement.address, owner)

  await agreement.activate(proxy.address, feeToken.address, actionCollateral, challengeCollateral, challengeDuration, { from: owner })
  console.log(`ConvictionVoting app activated!`)
}

async function createPermissions(acl, app, permissions, to, manager = to) {
  for (const permission of permissions) {
    const ROLE = await app[permission]()
    await acl.createPermission(to, app.address, ROLE, manager, { from: manager })
  }
}
