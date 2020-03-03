/* global artifacts contract beforeEach it assert */

const { getEventArgument } = require('@aragon/test-helpers/events')
const { hash } = require('eth-ens-namehash')
const deployDAO = require('./helpers/deployDAO')

const ConvictionVoting = artifacts.require('ConvictionVotingApp.sol')

const ANY_ADDRESS = '0xffffffffffffffffffffffffffffffffffffffff'

function calculateConviction(timePassed, initConv, amount, alpha) {
  const t = timePassed
  const y0 = initConv
  const x = amount
  const a = alpha
  const y = y0 * a ** t + (x * (1 - a ** t)) / (1 - a)
  return y
}

contract('CounterApp', ([appManager, user]) => {
  let app

  beforeEach('deploy dao and app', async () => {
    const { dao, acl } = await deployDAO(appManager)

    // Deploy the app's base contract.
    const appBase = await ConvictionVoting.new()

    // Instantiate a proxy for the app, using the base contract as its logic implementation.
    const instanceReceipt = await dao.newAppInstance(
      hash('conviction-voting.aragonpm.test'), // appId - Unique identifier for each app installed in the DAO; can be any bytes32 string in the tests.
      appBase.address, // appBase - Location of the app's base implementation.
      '0x', // initializePayload - Used to instantiate and initialize the proxy in the same call (if given a non-empty bytes string).
      false, // setDefault - Whether the app proxy is the default proxy.
      { from: appManager }
    )
    app = ConvictionVoting.at(
      getEventArgument(instanceReceipt, 'NewAppProxy', 'proxy')
    )

    // Set up the app's permissions.
    await acl.createPermission(
      ANY_ADDRESS, // entity (who?) - The entity or address that will have the permission.
      app.address, // app (where?) - The app that holds the role involved in this permission.
      await app.CREATE_PROPOSALS_ROLE(), // role (what?) - The particular role that the entity is being assigned to in this permission.
      appManager, // manager - Can grant/revoke further permissions for this role.
      { from: appManager }
    )

    await app.initialize(0x0, 0x0, 0x0, 9, 2, 2)
  })

  it('should be consistent with the conviction formula', async () => {
    for (let t = 0; t <= 1000; t += 100) {
      for (let y0 = 1; y0 <= 1e18; y0 *= 10) {
        for (let x = 1; x <= 1e18; x *= 10) {
          const sol = parseInt(await app.calculateConviction(t, y0, x))
          const js = Math.round(calculateConviction(t, y0, x, 0.9))
          if (sol === 0) {
            assert.equal(sol, js)
          } else {
            // Error < 0.1%
            assert.equal(Math.round((sol / js) * 1000) / 1000, 1)
          }
        }
      }
    }
  })
})
