/* global artifacts contract before it assert */

const { getEventArgument } = require('@aragon/test-helpers/events')
const { hash } = require('eth-ens-namehash')
const deployDAO = require('./helpers/deployDAO')
const timeAdvancer = require('./helpers/timeAdvancer')

const ConvictionVoting = artifacts.require('ConvictionVotingApp.sol')
const ERC20Mock = artifacts.require('ERC20Token.sol')

const ANY_ADDRESS = '0xffffffffffffffffffffffffffffffffffffffff'

contract('ConvictionVoting', ([appManager, user]) => {
  let app
  let miniMeMock
  // let requestToken - mock

  before('deploy dao and app', async () => {
    const { dao, acl } = await deployDAO(appManager)

    // Deploy the app's base contract.
    const appBase = await ConvictionVoting.new()
    miniMeMock = await ERC20Mock.new('mock', 'MMM', '18', {
      from: appManager,
    })

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

    await app.initialize(miniMeMock.address, 0x0, 0x0, 9, 2, 2)
  })

  it('should create proposals', async () => {
    const title = 'Conviction Voting'
    const receipt = await app.addProposal(title, '0x', 1000, user, {
      from: appManager,
    })
    assert.equal(getEventArgument(receipt, 'ProposalAdded', 'title'), title)
  })

  it('should stake an amount of tokens on proposal - by appManager', async () => {
    // assume that 1 block ~ 15 seconds
    // after 20 blocks
    await timeAdvancer.advanceTimeAndBlocksBy(15 * 20, 20)

    // When MiniMe mock token was created by appManager, he got all the supply, so
    // `staleToProposal` call passes functions `require`ments.
    const stakedTokens = 1000 // should be in total
    const stakesPerAppManager = 1000

    // let conviction -> should add assert on newly calculated conviction

    const receipt = await app.stakeToProposal(1, stakesPerAppManager, {
      from: appManager,
    })
    assert.equal(
      getEventArgument(receipt, 'StakeChanged', 'totalTokensStaked'),
      stakedTokens
    )
    assert.equal(
      getEventArgument(receipt, 'StakeChanged', 'tokensStaked'),
      stakesPerAppManager
    )
  })

  it('should stake an amount of tokens on proposal - by user', async () => {
    // assume that 1 block ~ 15 seconds
    // after 10 blocks (+30 totally)
    await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)
    // user should have some tokens
    await miniMeMock.transfer(user, 7000, { from: appManager })
    const stakesPerUser = 1000

    const currentProposal = await app.proposals.call(1)
    const currentlyStaked = currentProposal[2]

    const receipt = await app.stakeToProposal(1, stakesPerUser, { from: user })
    assert.equal(
      getEventArgument(receipt, 'StakeChanged', 'totalTokensStaked'),
      currentlyStaked.toNumber() + stakesPerUser
    )
    assert.equal(
      getEventArgument(receipt, 'StakeChanged', 'tokensStaked'),
      stakesPerUser
    )
  })

  it('should withdraw from proposal - by appManager', async () => {
    // assume that 1 block ~ 15 seconds
    // after 20 blocks (+50 totally)
    await timeAdvancer.advanceTimeAndBlocksBy(15 * 20, 20)

    const currentlProposal = await app.proposals.call(1)
    const currentlyStaked = currentlProposal[2]
    const withdrawAmount = 1000

    const receipt = await app.withdrawFromProposal(1, withdrawAmount, {
      from: appManager,
    })
    assert.equal(
      getEventArgument(receipt, 'StakeChanged', 'totalTokensStaked'),
      currentlyStaked - withdrawAmount
    )
    assert.equal(getEventArgument(receipt, 'StakeChanged', 'tokensStaked'), 0)
  })

  it('should stake more tokens - by user', async () => {
    // assume that 1 block ~ 15 seconds
    // after 10 blocks (+10 totally)
    await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)

    const currentProposal = await app.proposals.call(1)
    const currentlyStaked = currentProposal[2]
    const stakesPerUser = 6000

    const receipt = await app.stakeToProposal(1, stakesPerUser, { from: user })

    assert.equal(
      getEventArgument(receipt, 'StakeChanged', 'totalTokensStaked'),
      currentlyStaked.toNumber() + stakesPerUser
    )
    assert.equal(
      getEventArgument(receipt, 'StakeChanged', 'tokensStaked'),
      currentlyStaked.toNumber() + stakesPerUser
    )
  })

  it('should enact proposal', async () => {
    // assume that 1 block ~ 15 seconds
    // after 40 blocks (+100 totally)
    await timeAdvancer.advanceTimeAndBlocksBy(15 * 40, 40)
    // await app.executeProposal(1, false, { from: user })
  })
})
