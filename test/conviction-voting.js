/* global artifacts contract before beforeEach context it assert web3 */

const { getEventArgument } = require('@aragon/test-helpers/events')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const deployDAO = require('./helpers/deployDAO')
const installApp = require('./helpers/installApp')
const timeAdvancer = require('./helpers/timeAdvancer')
const deployer = require('@aragon/apps-agreement/test/helpers/utils/deployer')(web3, artifacts)

const ConvictionVoting = artifacts.require('ConvictionVoting')
const HookedTokenManager = artifacts.require('HookedTokenManager')
const MiniMeToken = artifacts.require('MiniMeToken')
const VaultMock = artifacts.require('VaultMock')

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
  let convictionVoting, stakeToken, requestToken, vault, agreement, collateralToken
  let SET_AGREEMENT_ROLE, CHALLENGE_ROLE
  const acc = { [appManager]: 'appManager', [user]: 'user' }

  before(async () => {
    agreement = await deployer.deployAndInitializeWrapper({ appManager })
    collateralToken = await deployer.deployCollateralToken()
    await agreement.sign(appManager)
    await agreement.sign(user, { from: user })

    SET_AGREEMENT_ROLE = await delayBase.SET_AGREEMENT_ROLE()
    CHALLENGE_ROLE = await deployer.base.CHALLENGE_ROLE()
  })

  const deploy = (
    decimals = 1,
    [appManagerTokens, userTokens] = [30000, 15000],
    vaultFunds = 15000,
    alpha = 0.9,
    beta = 0.2,
    rho = 0.002
  ) => async () => {

    // ERC20 accepts `decimals`. In order to create token with 45000 total supply
    // we provide `1` as `decimals` and `initialSupply` as 4500. So we get 4500*(10**1) total supply.
    stakeToken = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'stakeToken', decimals, 'TKN', true)

    const tokenManager = await installApp(deployer.dao, deployer.acl, HookedTokenManager,[[ANY_ADDRESS, 'MINT_ROLE'], [ANY_ADDRESS, 'SET_HOOK_ROLE']], appManager)
    await stakeToken.changeController(tokenManager.address)
    await tokenManager.initialize(stakeToken.address, true, 0)
    await tokenManager.mint(appManager, appManagerTokens)
    await tokenManager.mint(user, userTokens)

    vault = await VaultMock.new({ from: appManager })
    requestToken = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'DAI', 18, 'DAI', true)
    await requestToken.generateTokens(vault.address, vaultFunds)

    convictionVoting = await installApp(deployer.dao, deployer.acl, ConvictionVoting,[[ANY_ADDRESS, 'CREATE_PROPOSALS_ROLE']], appManager)
    await convictionVoting.initialize(stakeToken.address, vault.address, requestToken.address, alpha * 10 ** 7, beta * 10 ** 7, rho * 10 ** 7) // alpha = 0.9, beta = 0.2, rho = 0.002
    await agreement.activate({ disputable: delay, collateralToken, actionCollateral: 0, challengeCollateral: 0, challengeDuration: DELAY_LENGTH, from: rootAccount })
    await tokenManager.registerHook(convictionVoting.address)

    await deployer.acl.createPermission(agreement.address, convictionVoting.address, SET_AGREEMENT_ROLE, appManager)
    await deployer.acl.createPermission(ANY_ADDRESS, convictionVoting.address, CHALLENGE_ROLE, appManager)
  }

  context('typical usage', () => {

    before('deploy dao and convictionVoting', deploy())

    for (let i = 1; i <= 2; i++) {
      context(`Proposal ${i} (${i * 1000} DAI)`, async () => {
        it('should create proposals', async () => {
          const title = `Proposal ${i}`
          const receipt = await convictionVoting.addProposal(title, '0x', i * 1000, user, {
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

            const currentProposal = await convictionVoting.getProposal(i)
            const currentlyStaked = currentProposal[2].toNumber()

            // wrong amount
            await assertRevert(convictionVoting.stakeToProposal(i, 0, {from: account})) // CONVICTION_VOTING_ERROR_AMOUNT_CAN_NOT_BE_ZERO
            await assertRevert(convictionVoting.stakeToProposal(i, 1000000, {from: account})) // CONVICTION_VOTING_WITHDRAWED_MORE_THAN_STAKED

            const receipt = await convictionVoting.stakeToProposal(i, stakesPerAccount, {
              from: account,
            })
            assert.equal(
              (await convictionVoting.getProposal(i))[3].toNumber(),
              account === appManager ? 0 : 7458,
              'Conviction does not match expectations'
            )

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

          const currentlProposal = await convictionVoting.getProposal(i)
          const currentlyStaked = currentlProposal[2]
          const withdrawAmount = 1000

          const receipt = await convictionVoting.withdrawFromProposal(i, withdrawAmount, {
            from: appManager,
          })
          assert.equal(
            (await convictionVoting.getProposal(i))[3].toNumber(),
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

          const currentProposal = await convictionVoting.getProposal(i)
          const currentlyStaked = currentProposal[2]
          const stakesPerUser = 6000

          const receipt = await convictionVoting.stakeToProposal(i, stakesPerUser, {
            from: user,
          })
          assert.equal(
            (await convictionVoting.getProposal(i))[3].toNumber(),
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
            await convictionVoting.executeProposal(i, false, {from: user})
            const proposal = await convictionVoting.getProposal(i)
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
            await assertRevert(convictionVoting.executeProposal(i, false, {from: user})) // CONVICTION_VOTING_PROPOSAL_ALREADY_EXECUTED
          })
        } else {
          it(`should fail enacting proposal`, async () => {
            // assume that 1 block ~ 15 seconds
            // +40 blocks
            await timeAdvancer.advanceTimeAndBlocksBy(15 * 40, 40)
            await assertRevert(convictionVoting.executeProposal(i, false, {from: user})) // CONVICTION_VOTING_ERROR_INSUFFICIENT_CONVICION_TO_EXECUTE
          })
        }
      })
    }
  })

  context('Pure functions', async () => {
    context('Alpha = 0.9', async () => {
      beforeEach('deploy DAO and convictionVoting', deploy())
      it('conviction function', async () => {
        assert.equal(
          (await convictionVoting.calculateConviction(10, 0, 15000)).toNumber(),
          Math.round(calculateConviction(10, 0, 15000, 0.9))
        )
      })
      it('threshold function', async () => {
        assert.equal(
          (await convictionVoting.calculateThreshold(1000)).toNumber(),
          Math.round(calculateThreshold(1000, 15000, 45000, 0.9, 0.2, 0.002))
        )
      })
    })
    context('Halflife = 3 days', async () => {
      beforeEach(
        'deploy DAO and convictionVoting',
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
          (await convictionVoting.calculateConviction(17280, 0, 15000)).toNumber(),
          Math.round(calculateConviction(17280, 0, 15000, 0.9999599))
        )
      })
      it('threshold function', async () => {
        assert.equal(
          parseInt(
            await convictionVoting.calculateThreshold(BN('1000000000000000000'))
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
    beforeEach('deploy DAO and convictionVoting', deploy())

    it('should withdraw when staking after execution', async () => {
      // We create 3 proposals and stake 15k TKN in each one for 10 blocks
      for (let i = 1; i <= 3; i++) {
        await convictionVoting.addProposal(`Proposal ${i}`, '0x', 1000, appManager, {
          from: appManager,
        })
        await convictionVoting.stakeToProposal(i, 10000, {
          from: appManager,
        })
        await convictionVoting.stakeToProposal(i, 5000, {
          from: user,
        })
      }
      // +10 blocks
      await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)
      // We execute the proposals
      for (let i = 1; i <= 3; i++) {
        await convictionVoting.executeProposal(i, false, { from: user })
      }
      await convictionVoting.addProposal('Proposal 4', '0x', 1000, appManager, {
        from: appManager,
      })
      // We can stake all tokens on proposal 4
      await convictionVoting.stakeToProposal(4, 30000, {
        from: appManager,
      })
      await convictionVoting.stakeToProposal(4, 7500, {
        from: user,
      })
      await convictionVoting.stakeToProposal(4, 7500, {
        from: user,
      })
    })

    it('should not count tokens as staked when they have been transfered', async () => {
      const id1 = getEventArgument(
        await convictionVoting.addProposal(`Proposal 1`, '0x', 1000, appManager, {
          from: appManager,
        }),
        'ProposalAdded',
        'id'
      )
      const id2 = getEventArgument(
        await convictionVoting.addProposal(`Proposal 2`, '0x', 1000, appManager, {
          from: appManager,
        }),
        'ProposalAdded',
        'id'
      )

      await convictionVoting.stakeToProposal(id1, 10000, {
        from: appManager,
      })
      await convictionVoting.stakeToProposal(id2, 20000, {
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

      await convictionVoting.stakeToProposal(id1, 25000, {
        from: user,
      })
      await convictionVoting.stakeToProposal(id2, 5000, {
        from: user,
      })
      assert.equal(
        (await convictionVoting.getProposal(id1))[3].toNumber(),
        51145,
        `Proposal ${id1} conviction does not match expectations`
      )
      assert.equal(
        (await convictionVoting.getProposal(id2))[3].toNumber(),
        174547,
        `Proposal ${id1} conviction does not match expectations`
      )
    })
  })
})
