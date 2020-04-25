/* global artifacts contract before context it assert */

const { getEventArgument } = require('@aragon/test-helpers/events')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { hash } = require('eth-ens-namehash')
const deployDAO = require('./helpers/deployDAO')
const timeAdvancer = require('./helpers/timeAdvancer')

const ConvictionVoting = artifacts.require('ConvictionVoting.sol')
const MiniMeToken = artifacts.require('@aragon/apps-shared-minime/MiniMeToken')
const VaultMock = artifacts.require('VaultMock.sol')

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ANY_ADDRESS = '0xffffffffffffffffffffffffffffffffffffffff'

contract('ConvictionVoting', ([appManager, user]) => {
  let app, stakeToken, requestToken, vault
  const acc = { [appManager]: 'appManager', [user]: 'user' }

  before('deploy dao and app', async () => {
    const { dao, acl } = await deployDAO(appManager)

    // Deploy the app's base contract.
    const appBase = await ConvictionVoting.new()

    // Deploying tokens, used in conviction app

    // ERC20 accepts `decimals`. In order to create token with 45000 total supply
    // we provide `1` as `decimals` and `initialSupply` as 4500. So we get 4500*(10**1) total supply.
    stakeToken = await MiniMeToken.new(
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      0,
      'stakeToken',
      1,
      'TKN',
      true
    )
    await stakeToken.generateTokens(appManager, 30000)
    await stakeToken.generateTokens(user, 15000)

    vault = await VaultMock.new({ from: appManager })

    requestToken = await MiniMeToken.new(
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      0,
      'DAI',
      18,
      'DAI',
      true
    )
    await requestToken.generateTokens(vault.address, 15000)

    // Instantiate a proxy for the app, using the base contract as its logic implementation.
    const instanceReceipt = await dao.newAppInstance(
      hash('conviction-voting.aragonpm.test'), // appId - Unique identifier for each app installed in the DAO; can be any bytes32 string in the tests.
      appBase.address, // appBase - Location of the app's base implementation.
      '0x', // initializePayload - Used to instantiate and initialize the proxy in the same call (if given a non-empty bytes string).
      false, // setDefault - Whether the app proxy is the default proxy.
      { from: appManager }
    )
    app = await ConvictionVoting.at(
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
      0.9 * 10 ** 7, // alpha = 0.9
      0.2 * 10 ** 7, // beta = 0.2
      0.002 * 10 ** 7 // rho = 0.002
    )
  })
  for (let i = 1; i <= 2; i++) {
    context(`Proposal ${i} (${i * 1000} DAI)`, async () => {
      it('should create proposals', async () => {
        const title = `Proposal ${i}`
        const receipt = await app.addProposal(title, '0x', i * 1000, user, {
          from: appManager,
        })
        assert.equal(getEventArgument(receipt, 'ProposalAdded', 'title'), title)
      })

      for (const account of [appManager, user]) {
        it(`should stake an amount of tokens on proposal - by ${acc[account]}`, async () => {
          // assume that 1 block ~ 15 seconds
          // +10 blocks
          await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)
          const stakesPerAccount = 1000

          const currentProposal = await app.getProposal(i)
          const currentlyStaked = currentProposal[2].toNumber()

          // wrong amount
          await assertRevert(app.stakeToProposal(i, 0, { from: account })) // CONVICTION_VOTING_ERROR_AMOUNT_CAN_NOT_BE_ZERO
          await assertRevert(app.stakeToProposal(i, 1000000, { from: account })) // CONVICTION_VOTING_WITHDRAWED_MORE_THAN_STAKED

          const receipt = await app.stakeToProposal(i, stakesPerAccount, {
            from: account,
          })
          assert.equal(
            (await app.getProposal(i))[3].toNumber(),
            account === appManager ? 0 : 7458,
            'Conviction does not match expectations'
          )
          const totalTokensStaked = getEventArgument(
            receipt,
            'StakeChanged',
            'totalTokensStaked'
          ).toNumber()
          assert.equal(totalTokensStaked, currentlyStaked + stakesPerAccount)
          const tokensStaked = getEventArgument(
            receipt,
            'StakeChanged',
            'tokensStaked'
          ).toNumber()
          assert.equal(tokensStaked, stakesPerAccount)
        })
      }

      it(`should withdraw from proposal - by ${acc[appManager]}`, async () => {
        // assume that 1 block ~ 15 seconds
        // +20 blocks
        await timeAdvancer.advanceTimeAndBlocksBy(15 * 20, 20)

        const currentlProposal = await app.getProposal(i)
        const currentlyStaked = currentlProposal[2]
        const withdrawAmount = 1000

        const receipt = await app.withdrawFromProposal(i, withdrawAmount, {
          from: appManager,
        })
        assert.equal(
          (await app.getProposal(i))[3].toNumber(),
          18628,
          'Conviction does not match expectations'
        )
        assert.equal(
          getEventArgument(
            receipt,
            'StakeChanged',
            'totalTokensStaked'
          ).toNumber(),
          currentlyStaked - withdrawAmount
        )
        assert.equal(
          getEventArgument(receipt, 'StakeChanged', 'tokensStaked').toNumber(),
          0
        )
      })

      it(`should stake more tokens - by ${acc[user]}`, async () => {
        // assume that 1 block ~ 15 seconds
        // +10 blocks
        await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)

        const currentProposal = await app.getProposal(i)
        const currentlyStaked = currentProposal[2]
        const stakesPerUser = 6000

        const receipt = await app.stakeToProposal(i, stakesPerUser, {
          from: user,
        })
        assert.equal(
          (await app.getProposal(i))[3].toNumber(),
          12708,
          'Conviction does not match expectations'
        )

        assert.equal(
          getEventArgument(
            receipt,
            'StakeChanged',
            'totalTokensStaked'
          ).toNumber(),
          currentlyStaked.toNumber() + stakesPerUser
        )
        assert.equal(
          getEventArgument(receipt, 'StakeChanged', 'tokensStaked').toNumber(),
          currentlyStaked.toNumber() + stakesPerUser
        )
      })

      if (i === 1) {
        it(`should enact proposal`, async () => {
          // assume that 1 block ~ 15 seconds
          // +40 blocks
          await timeAdvancer.advanceTimeAndBlocksBy(15 * 40, 40)
          await app.executeProposal(i, false, { from: user })
          const proposal = await app.getProposal(i)
          assert.equal(
            proposal[3].toNumber(),
            69238,
            'Conviction does not match expectations'
          )
          assert.isTrue(proposal[5], 'Proposal not marked as executed')
          assert.equal(
            (await requestToken.balanceOf(vault.address)).toNumber(),
            14000,
            'Incorrect amount of money sent'
          )
        })

        it('should not enact same proposal second time', async () => {
          await assertRevert(app.executeProposal(i, false, { from: user })) // CONVICTION_VOTING_PROPOSAL_ALREADY_EXECUTED
        })
      } else {
        it(`should fail enacting proposal`, async () => {
          // assume that 1 block ~ 15 seconds
          // +40 blocks
          await timeAdvancer.advanceTimeAndBlocksBy(15 * 40, 40)
          await assertRevert(app.executeProposal(i, false, { from: user })) // CONVICTION_VOTING_ERROR_INSUFFICIENT_CONVICION_TO_EXECUTE
        })
      }
    })
  }

  context('Special withdraws', async () => {
    it('should withdraw when staking after execution', async () => {
      // We create 3 proposals and stake 10k TKN in each one for 10 blocks
      for (let i = 3; i <= 5; i++) {
        await app.addProposal(`Proposal ${i}`, '0x', 1000, appManager, {
          from: appManager,
        })
        await app.stakeToProposal(i, 10000, {
          from: appManager,
        })
        await app.stakeToProposal(i, 1000, {
          from: user,
        })
      }
      // +10 blocks
      await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)
      // We execute the proposals
      for (let i = 3; i <= 5; i++) {
        await app.executeProposal(i, false, { from: user })
      }
      await app.addProposal('Proposal 6', '0x', 1000, appManager, {
        from: appManager,
      })
      // We can stake all tokens on proposal 4
      await app.stakeToProposal(6, 30000, {
        from: appManager,
      })
    })
  })
})
