const { hash } = require('eth-ens-namehash')
const { getEventArgument } = require('@aragon/contract-helpers-test')

let i = 1
const installApp = async (
  dao,
  acl,
  artifact,
  permissions,
  manager,
  args = []
) => {
  // Deploy the app's base contract.
  const appBase = await artifact.new(...args)
  // Instantiate a proxy for the app, using the base contract as its logic implementation.
  const instanceReceipt = await dao.newAppInstance(
    hash(`app${i++}.aragonpm.test`), // appId - Unique identifier for each app installed in the DAO; can be any bytes32 string in the tests.
    appBase.address, // appBase - Location of the app's base implementation.
    '0x', // initializePayload - Used to instantiate and initialize the proxy in the same call (if given a non-empty bytes string).
    false, // setDefault - Whether the app proxy is the default proxy.
    { from: manager }
  )
  const app = await artifact.at(
    getEventArgument(instanceReceipt, 'NewAppProxy', 'proxy')
  )
  // Set up the app's permissions.
  for (const [entity, role] of permissions) {
    await acl.createPermission(
      entity, // entity (who?) - The entity or address that will have the permission.
      app.address, // app (where?) - The app that holds the role involved in this permission.
      await app[role](), // role (what?) - The particular role that the entity is being assigned to in this permission.
      manager, // manager - Can grant/revoke further permissions for this role.
      { from: manager }
    )
  }
  return app
}

module.exports = installApp
