const { getEventArgument } = require('@aragon/contract-helpers-test')

module.exports = async (artifacts, options = {}) => {
  let { kernelBase, aclBase, evmScriptReg, daoFact, dao, acl, owner } = options
  const Kernel = artifacts.require('Kernel')
  const ACL = artifacts.require('ACL')

  if (dao) {
    const deployedAcl = await dao.acl()
    return { ...options, dao, acl: await ACL.at(deployedAcl) }
  }

  if (!kernelBase) {
    console.log(`Deploying Kernel Base...`)
    kernelBase = await Kernel.new(true)
    console.log(`Kernel Base: ${ kernelBase.address }`)
  }

  if (!aclBase) {
    console.log(`Deploying ACL Base...`)
    aclBase = await ACL.new()
    console.log(`ACL Base: ${ aclBase.address }`)
  }

  if (!evmScriptReg) {
    console.log(`Deploying EVMScriptRegistryFactory...`)
    const EVMScriptRegistryFactory = artifacts.require('EVMScriptRegistryFactory')
    evmScriptReg = await EVMScriptRegistryFactory.new()
    console.log(`EVMScriptRegistryFactory: ${ evmScriptReg.address }`)
  }

  if (!daoFact) {
    console.log(`Deploying DAO Factory...`)
    const DAOFactory = artifacts.require('DAOFactory')
    daoFact = await DAOFactory.new(kernelBase.address, aclBase.address, evmScriptReg.address)
    console.log(`DAO Factory: ${ daoFact.address }`)
  }

  console.log(`Creating DAO...`)
  const kernelReceipt = await daoFact.newDAO(owner)
  dao = await Kernel.at(getEventArgument(kernelReceipt, 'DeployDAO', 'dao'))
  console.log(`DAO: ${ dao.address }`)

  console.log(`Assigning Permissions...`)
  acl = await ACL.at(await dao.acl())
  const APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
  await acl.createPermission(owner, dao.address, APP_MANAGER_ROLE, owner, { from: owner })
  console.log(`Assigned APP_MANAGER_ROLE`)

  return { ...options, dao, acl }
}