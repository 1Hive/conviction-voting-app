/* global artifacts contract before it assert */

const { getEventArgument } = require('@aragon/test-helpers/events')
const { hash } = require('eth-ens-namehash')
const deployDAO = require('./helpers/deployDAO')
const timeAdvancer = require('./helpers/timeAdvancer')

const ConvictionVoting = artifacts.require('ConvictionVotingApp.sol')
const ERC20Mock = artifacts.require('ERC20Token.sol')
const VaultMock = artifacts.require('VaultMock.sol')

const ANY_ADDRESS = '0xffffffffffffffffffffffffffffffffffffffff'

const expectThrow = async promise => {
  try {
    await promise
  } catch (error) {
    const invalidOpcode = error.message.search('invalid opcode') >= 0
    const outOfGas = error.message.search('out of gas') >= 0
    const revert = error.message.search('revert') >= 0
    assert(
      invalidOpcode || outOfGas || revert,
      "Expected throw, got '" + error + "' instead"
    )
    return
  }
  assert.fail('Expected throw not received')
}

contract('ConvictionVoting-passing proposal', ([appManager, user, anyAcc]) => {
  let app
  let stakeToken
  // DAI mock
  let requestToken
  let vault

  before('deploy dao and app', async () => {
    const { dao, acl } = await deployDAO(appManager)

    // Deploy the app's base contract.
    const appBase = await ConvictionVoting.new()

    // Deploying tokens, used in conviction app

    // ERC20 accepts `decimals`. In order to create token with 45000 total supply
    // we provide `1` as `decimals` and `initialSupply` as 4500. So we get 4500*(10**1) total supply.
    stakeToken = await ERC20Mock.new('stakeToken', 'TKN', 1, 4500, {
      from: anyAcc,
    })
    await stakeToken.transfer(appManager, 30000, { from: anyAcc })
    await stakeToken.transfer(user, 15000, { from: anyAcc })

    vault = await VaultMock.new({ from: appManager })

    requestToken = await ERC20Mock.new('DAI', 'DAI', 18, 100000, {
      from: appManager,
    })
    await requestToken.transfer(vault.address, 15000, { from: appManager })

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

    await app.initialize(
      stakeToken.address,
      vault.address,
      requestToken.address,
      9,
      2,
      2
    )
  })

  it('should create proposals', async () => {
    // transaction is at block 21
    const title = 'Conviction Voting'
    const receipt = await app.addProposal(title, '0x', 1000, user, {
      from: appManager,
    })
    assert.equal(getEventArgument(receipt, 'ProposalAdded', 'title'), title)
  })

  it('should stake an amount of tokens on proposal - by appManager', async () => {
    // assume that 1 block ~ 15 seconds
    // should be at block 30
    await timeAdvancer.advanceTimeAndBlocksBy(15 * 8, 8)

    // When MiniMe mock token was created by appManager, he got all the supply, so
    // `staleToProposal` call passes functions `require`ments.
    const stakedTokens = 1000 // should be in total
    const stakesPerAppManager = 1000

    // wrong amount
    await expectThrow(app.stakeToProposal(1, 0, { from: appManager }))
    await expectThrow(app.stakeToProposal(1, 1000000, { from: appManager }))

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
    // at block 40
    await timeAdvancer.advanceTimeAndBlocksBy(15 * 9, 9)
    const stakesPerUser = 1000

    const currentProposal = await app.proposals.call(1)
    const currentlyStaked = currentProposal[2]

    // wrong amount
    await expectThrow(app.stakeToProposal(1, 0, { from: user }))
    await expectThrow(app.stakeToProposal(1, 1000000, { from: user }))

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
    // at block 60
    await timeAdvancer.advanceTimeAndBlocksBy(15 * 19, 19)

    const currentlProposal = await app.proposals.call(1)
    const currentlyStaked = currentlProposal[2]
    const withdrawAmount = 1000

    // wrong amount
    await expectThrow(app.stakeToProposal(1, 0, { from: appManager }))
    await expectThrow(app.stakeToProposal(1, 1000000, { from: appManager }))

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
    // at block 70
    await timeAdvancer.advanceTimeAndBlocksBy(15 * 9, 9)

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
    // at block 110
    await timeAdvancer.advanceTimeAndBlocksBy(15 * 39, 39)
    await app.executeProposal(1, false, { from: user })
  })

  it('should not enact same proposal second time', async () => {
    await timeAdvancer.advanceTimeAndBlocksBy(15 * 39, 39)
    await expectThrow(app.executeProposal(1, false, { from: user }))
  })
})

contract('ConvictionVoting-failing proposal', ([appManager, user, anyAcc]) => {
  let app
  let stakeToken
  // DAI mock
  let requestToken
  let vault

  before('deploy dao and app', async () => {
    const { dao, acl } = await deployDAO(appManager)

    // Deploy the app's base contract.
    const appBase = await ConvictionVoting.new()

    // Deploying tokens, used in conviction app

    // ERC20 accepts `decimals`. In order to create token with 45000 total supply
    // we provide `1` as `decimals` and `initialSupply` as 4500. So we get 4500*(10**1) total supply.
    stakeToken = await ERC20Mock.new('stakeToken', 'TKN', 1, 4500, {
      from: anyAcc,
    })
    await stakeToken.transfer(appManager, 30000, { from: anyAcc })
    await stakeToken.transfer(user, 15000, { from: anyAcc })

    vault = await VaultMock.new({ from: appManager })

    requestToken = await ERC20Mock.new('DAI', 'DAI', 18, 100000, {
      from: appManager,
    })
    await requestToken.transfer(vault.address, 15000, { from: appManager })

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

    await app.initialize(
      stakeToken.address,
      vault.address,
      requestToken.address,
      9,
      2,
      2
    )
  })

  it('should create proposals', async () => {
    // transaction is at block 21
    const title = 'Aragon Sidechain'
    const receipt = await app.addProposal(title, '0x', 2000, appManager, {
      from: user,
    })
    assert.equal(getEventArgument(receipt, 'ProposalAdded', 'title'), title)
  })

  it('should stake an amount of tokens on proposal - by appManager', async () => {
    // assume that 1 block ~ 15 seconds
    // should be at block 30
    await timeAdvancer.advanceTimeAndBlocksBy(15 * 8, 8)

    // When MiniMe mock token was created by appManager, he got all the supply, so
    // `staleToProposal` call passes functions `require`ments.
    const stakedTokens = 1000 // should be in total
    const stakesPerAppManager = 1000

    // wrong amount
    await expectThrow(app.stakeToProposal(1, 0, { from: appManager }))
    await expectThrow(app.stakeToProposal(1, 100000, { from: appManager }))

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
    // at block 40
    await timeAdvancer.advanceTimeAndBlocksBy(15 * 9, 9)
    const stakesPerUser = 1000

    const currentProposal = await app.proposals.call(1)
    const currentlyStaked = currentProposal[2]

    // wrong amount
    await expectThrow(app.stakeToProposal(1, 0, { from: user }))
    await expectThrow(app.stakeToProposal(1, 100000, { from: user }))

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
    // at block 60
    await timeAdvancer.advanceTimeAndBlocksBy(15 * 19, 19)

    const currentlProposal = await app.proposals.call(1)
    const currentlyStaked = currentlProposal[2]
    const withdrawAmount = 1000

    // wrong amount
    await expectThrow(app.stakeToProposal(1, 0, { from: appManager }))
    await expectThrow(app.stakeToProposal(1, 1000000, { from: appManager }))

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
    // at block 70
    await timeAdvancer.advanceTimeAndBlocksBy(15 * 9, 9)

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

  it('should fail enacting proposal', async () => {
    // assume that 1 block ~ 15 seconds
    // at block 110
    await timeAdvancer.advanceTimeAndBlocksBy(15 * 39, 39)
    await expectThrow(app.executeProposal(1, false, { from: user }))
  })
})
