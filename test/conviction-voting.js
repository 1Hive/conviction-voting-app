/* global artifacts contract before beforeEach context it assert web3 */

const { getEventArgument } = require('@aragon/test-helpers/events')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const deployDAO = require('./helpers/deployDAO')
const installApp = require('./helpers/installApp')
const timeAdvancer = require('./helpers/timeAdvancer')

const ConvictionVoting = artifacts.require('ConvictionVoting.sol')
const HookedTokenManager = artifacts.require(
  '@1hive/apps-token-manager/contracts/HookedTokenManager.sol'
)
const MiniMeToken = artifacts.require('@aragon/apps-shared-minime/MiniMeToken')
const VaultMock = artifacts.require('VaultMock.sol')

const BN = web3.utils.toBN

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ANY_ADDRESS = '0xffffffffffffffffffffffffffffffffffffffff'

function calculateConviction(t, y0, x, a) {
  return y0 * a ** t + (x * (1 - a ** t)) / (1 - a)
}

function calculateThreshold(requested, funds, supply, alpha, beta, rho) {
  const share = requested / funds
  if (share < beta) {
    return (supply * rho) / (1 - alpha) / (beta - share) ** 2
  } else {
    return Number.POSITIVE_INFINITY
  }
}

contract('ConvictionVoting', ([appManager, user]) => {
  let app, stakeToken, requestToken, vault
  const acc = { [appManager]: 'appManager', [user]: 'user' }

  const deploy = (
    decimals = 1,
    [appManagerTokens, userTokens] = [30000, 15000],
    vaultFunds = 15000,
    alpha = 0.9,
    beta = 0.2,
    rho = 0.002
  ) => async () => {
    const { dao, acl } = await deployDAO(appManager)

    // Deploying tokens, used in conviction app

    // ERC20 accepts `decimals`. In order to create token with 45000 total supply
    // we provide `1` as `decimals` and `initialSupply` as 4500. So we get 4500*(10**1) total supply.
    stakeToken = await MiniMeToken.new(
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      0,
      'stakeToken',
      decimals,
      'TKN',
      true
    )

    const tm = await installApp(
      dao,
      acl,
      HookedTokenManager,
      [
        [ANY_ADDRESS, 'MINT_ROLE'],
        [ANY_ADDRESS, 'SET_HOOK_ROLE'],
      ],
      appManager
    )
    await stakeToken.changeController(tm.address)
    await tm.initialize(stakeToken.address, true, 0)
    await tm.mint(appManager, appManagerTokens)
    await tm.mint(user, userTokens)

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
    await requestToken.generateTokens(vault.address, vaultFunds)

    app = await installApp(
      dao,
      acl,
      ConvictionVoting,
      [[ANY_ADDRESS, 'CREATE_PROPOSALS_ROLE']],
      appManager
    )

    await app.initialize(
      stakeToken.address,
      vault.address,
      requestToken.address,
      alpha * 10 ** 7, // alpha = 0.9
      beta * 10 ** 7, // beta = 0.2
      rho * 10 ** 7 // rho = 0.002
    )

    await tm.registerHook(app.address)
  }

  before('deploy dao and app', deploy())

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

          console.log(receipt)

          const totalTokensStaked = getEventArgument(
            receipt,
            'StakeAdded',
            'totalTokensStaked'
          ).toNumber()
          assert.equal(totalTokensStaked, currentlyStaked + stakesPerAccount)
          const tokensStaked = getEventArgument(
            receipt,
            'StakeAdded',
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
            'StakeWithdrawn',
            'totalTokensStaked'
          ).toNumber(),
          currentlyStaked - withdrawAmount
        )
        assert.equal(
          getEventArgument(receipt, 'StakeWithdrawn', 'tokensStaked').toNumber(),
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
            'StakeAdded',
            'totalTokensStaked'
          ).toNumber(),
          currentlyStaked.toNumber() + stakesPerUser
        )
        assert.equal(
          getEventArgument(receipt, 'StakeAdded', 'tokensStaked').toNumber(),
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

  context('Pure functions', async () => {
    context('Alpha = 0.9', async () => {
      beforeEach('deploy DAO and app', deploy())
      it('conviction function', async () => {
        assert.equal(
          (await app.calculateConviction(10, 0, 15000)).toNumber(),
          Math.round(calculateConviction(10, 0, 15000, 0.9))
        )
      })
      it('threshold function', async () => {
        assert.equal(
          (await app.calculateThreshold(1000)).toNumber(),
          Math.round(calculateThreshold(1000, 15000, 45000, 0.9, 0.2, 0.002))
        )
      })
    })
    context('Halflife = 3 days', async () => {
      beforeEach(
        'deploy DAO and app',
        deploy(
          18,
          [BN('1000000000000000000000'), BN('164000000000000000000')],
          BN('745000000000000000000'),
          0.9999599,
          0.2,
          0.002
        )
      )
      it('conviction function', async () => {
        assert.equal(
          (await app.calculateConviction(17280, 0, 15000)).toNumber(),
          Math.round(calculateConviction(17280, 0, 15000, 0.9999599))
        )
      })
      it('threshold function', async () => {
        assert.equal(
          parseInt(
            await app.calculateThreshold(BN('1000000000000000000'))
          ).toPrecision(10),
          calculateThreshold(
            1,
            745,
            1164000000000000000000,
            0.9999599,
            0.2,
            0.002
          ).toPrecision(10)
        )
      })
    })
  })

  context('Special withdraws', async () => {
    beforeEach('deploy DAO and app', deploy())

    it('should withdraw when staking after execution', async () => {
      // We create 3 proposals and stake 15k TKN in each one for 10 blocks
      for (let i = 1; i <= 3; i++) {
        await app.addProposal(`Proposal ${i}`, '0x', 1000, appManager, {
          from: appManager,
        })
        await app.stakeToProposal(i, 10000, {
          from: appManager,
        })
        await app.stakeToProposal(i, 5000, {
          from: user,
        })
      }
      // +10 blocks
      await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)
      // We execute the proposals
      for (let i = 1; i <= 3; i++) {
        await app.executeProposal(i, false, { from: user })
      }
      await app.addProposal('Proposal 4', '0x', 1000, appManager, {
        from: appManager,
      })
      // We can stake all tokens on proposal 4
      await app.stakeToProposal(4, 30000, {
        from: appManager,
      })
      await app.stakeToProposal(4, 7500, {
        from: user,
      })
      await app.stakeToProposal(4, 7500, {
        from: user,
      })
    })

    it('should not count tokens as staked when they have been transfered', async () => {
      const id1 = getEventArgument(
        await app.addProposal(`Proposal 1`, '0x', 1000, appManager, {
          from: appManager,
        }),
        'ProposalAdded',
        'id'
      )
      const id2 = getEventArgument(
        await app.addProposal(`Proposal 2`, '0x', 1000, appManager, {
          from: appManager,
        }),
        'ProposalAdded',
        'id'
      )

      await app.stakeToProposal(id1, 10000, {
        from: appManager,
      })
      await app.stakeToProposal(id2, 20000, {
        from: appManager,
      })
      // +10 blocks
      await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)
      await stakeToken.transfer(user, 5000, {
        from: appManager,
      })

      // +10 blocks
      await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)
      await stakeToken.transfer(user, 10000, {
        from: appManager,
      })

      await app.stakeToProposal(id1, 25000, {
        from: user,
      })
      await app.stakeToProposal(id2, 5000, {
        from: user,
      })
      assert.equal(
        (await app.getProposal(id1))[3].toNumber(),
        51145,
        `Proposal ${id1} conviction does not match expectations`
      )
      assert.equal(
        (await app.getProposal(id2))[3].toNumber(),
        174547,
        `Proposal ${id1} conviction does not match expectations`
      )
    })
  })
})
