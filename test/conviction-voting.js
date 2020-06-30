/* global artifacts contract before beforeEach context it assert web3 */

const { getEventArgument } = require('@aragon/contract-helpers-test/events')
const { assertRevert } = require('@aragon/apps-agreement/test/helpers/assert/assertThrow')
const { RULINGS } = require('@aragon/apps-agreement/test/helpers/utils/enums')
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
const ONE_DAY = 60 * 60 * 24

const PROPOSAL_STATUS = {
  ACTIVE: 0,
  PAUSED: 1,
  CANCELLED: 2,
  EXECUTED: 3
}

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
  const acc = { [appManager]: 'appManager', [user]: 'user' }

  before(async () => {
    agreement = await deployer.deployAndInitializeWrapper({ appManager })
    collateralToken = await deployer.deployCollateralToken()
    await agreement.sign(appManager)
    await agreement.sign(user, { from: user })
  })

  const deploy = async (
    decimals = 1,
    [appManagerTokens, userTokens] = [30000, 15000],
    vaultFunds = 15000,
    alpha = 0.9,
    beta = 0.2,
    rho = 0.002
  ) => {

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
    await tokenManager.registerHook(convictionVoting.address)

    const SetAgreementRole = await convictionVoting.SET_AGREEMENT_ROLE()
    await deployer.acl.createPermission(agreement.address, convictionVoting.address, SetAgreementRole, appManager)
    const ChallengeRole = await deployer.base.CHALLENGE_ROLE()
    await deployer.acl.createPermission(ANY_ADDRESS, convictionVoting.address, ChallengeRole, appManager)
    await agreement.activate({ disputable: convictionVoting, collateralToken, actionCollateral: 0, challengeCollateral: 0, challengeDuration: ONE_DAY, from: appManager })
  }

  context('Typical usage', () => {

    // Note these tests use a before for deployment, they must be executed in order.
    before('deploy dao and convictionVoting', async () => {await deploy()})

    for (let i = 1; i <= 2; i++) {
      context(`Proposal ${i} (${i * 1000} DAI)`, () => {
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
            await assertRevert(convictionVoting.stakeToProposal(i, 0, {from: account}), "CV_AMOUNT_CAN_NOT_BE_ZERO")
            await assertRevert(convictionVoting.stakeToProposal(i, 1000000, {from: account}), "CV_STAKED_MORE_THAN_OWNED")

            const receipt = await convictionVoting.stakeToProposal(i, stakesPerAccount, {from: account,})
            assert.equal((await convictionVoting.getProposal(i))[3].toNumber(), account === appManager ? 0 : 7458, 'Conviction does not match expectations')

            const totalTokensStaked = getEventArgument(receipt, 'StakeAdded', 'totalTokensStaked').toNumber()
            assert.equal(totalTokensStaked, currentlyStaked + stakesPerAccount)
            const tokensStaked = getEventArgument(receipt, 'StakeAdded', 'tokensStaked').toNumber()
            assert.equal(tokensStaked, stakesPerAccount)
          })
        }

        it(`should withdraw from proposal - by ${acc[appManager]}`, async () => {
          // assume that 1 block ~ 15 seconds
          // +20 blocks
          await timeAdvancer.advanceTimeAndBlocksBy(15 * 20, 20)

          const currentProposal = await convictionVoting.getProposal(i)
          const currentlyStaked = currentProposal[2]
          const withdrawAmount = 1000

          const receipt = await convictionVoting.withdrawFromProposal(i, withdrawAmount, {from: appManager,})
          assert.equal((await convictionVoting.getProposal(i))[3].toNumber(), 18628, 'Conviction does not match expectations')
          assert.equal(getEventArgument(receipt, 'StakeWithdrawn', 'totalTokensStaked').toNumber(), currentlyStaked - withdrawAmount)
          assert.equal(getEventArgument(receipt, 'StakeWithdrawn', 'tokensStaked').toNumber(), 0)
        })

        it(`should stake more tokens - by ${acc[user]}`, async () => {
          // assume that 1 block ~ 15 seconds
          // +10 blocks
          await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)

          const currentProposal = await convictionVoting.getProposal(i)
          const currentlyStaked = currentProposal[2]
          const stakesPerUser = 6000

          const receipt = await convictionVoting.stakeToProposal(i, stakesPerUser, {from: user,})
          assert.equal((await convictionVoting.getProposal(i))[3].toNumber(), 12708, 'Conviction does not match expectations')

          assert.equal(getEventArgument(receipt, 'StakeAdded', 'totalTokensStaked').toNumber(), currentlyStaked.toNumber() + stakesPerUser)
          assert.equal(getEventArgument(receipt, 'StakeAdded', 'tokensStaked').toNumber(), currentlyStaked.toNumber() + stakesPerUser)
        })

        if (i === 1) {
          it(`should enact proposal`, async () => {
            // assume that 1 block ~ 15 seconds
            // +40 blocks
            await timeAdvancer.advanceTimeAndBlocksBy(15 * 40, 40)
            await convictionVoting.executeProposal(i, false, {from: user})
            const proposal = await convictionVoting.getProposal(i)
            assert.equal(proposal[3].toNumber(), 69238, 'Conviction does not match expectations')
            assert.equal(proposal[6], PROPOSAL_STATUS.EXECUTED, 'Proposal not marked as executed')
            assert.equal((await requestToken.balanceOf(vault.address)).toNumber(), 14000, 'Incorrect amount of money sent')
          })

          it('should not enact same proposal second time', async () => {
            await assertRevert(convictionVoting.executeProposal(i, false, {from: user}), "CV_PROPOSAL_NOT_ACTIVE")
          })
        } else {
          it(`should fail enacting proposal`, async () => {
            // assume that 1 block ~ 15 seconds
            // +40 blocks
            await timeAdvancer.advanceTimeAndBlocksBy(15 * 40, 40)
            await assertRevert(convictionVoting.executeProposal(i, false, {from: user}), "CV_INSUFFICIENT_CONVICION")
          })
        }
      })
    }
  })

  context('Pure functions', () => {
    context('Alpha = 0.9', () => {

      beforeEach('deploy DAO and convictionVoting', async () => {
        await deploy()
      })

      it('conviction function', async () => {
        assert.equal((await convictionVoting.calculateConviction(10, 0, 15000)).toNumber(),
          Math.round(calculateConviction(10, 0, 15000, 0.9))
        )
      })

      it('threshold function', async () => {
        assert.equal((await convictionVoting.calculateThreshold(1000)).toNumber(),
          Math.round(calculateThreshold(1000, 15000, 45000, 0.9, 0.2, 0.002))
        )
      })
    })
    context('Halflife = 3 days', () => {

      beforeEach(
        'deploy DAO and convictionVoting',
        async () => {
          await deploy(
          18,
          [BN('1000000000000000000000'), BN('164000000000000000000')],
          BN('745000000000000000000'),
          0.9999599,
          0.2,
          0.002
        )}
      )

      it('conviction function', async () => {
        assert.equal((await convictionVoting.calculateConviction(17280, 0, 15000)).toNumber(), Math.round(calculateConviction(17280, 0, 15000, 0.9999599)))
      })

      it('threshold function', async () => {
        assert.equal(
          parseInt(await convictionVoting.calculateThreshold(BN('1000000000000000000')))
            .toPrecision(10), calculateThreshold(1, 745, 1164000000000000000000, 0.9999599, 0.2, 0.002)
              .toPrecision(10))
      })
    })
  })

  context('Special withdraws', () => {

    beforeEach('deploy DAO and convictionVoting', async () => {
      await deploy()
    })

    it('should withdraw when staking after execution', async () => {
      // We create 3 proposals and stake 15k TKN in each one for 10 blocks
      for (let i = 1; i <= 3; i++) {
        await convictionVoting.addProposal(`Proposal ${i}`, '0x', 1000, appManager, {from: appManager})
        await convictionVoting.stakeToProposal(i, 10000, {from: appManager})
        await convictionVoting.stakeToProposal(i, 5000, {from: user,})
      }
      // +10 blocks
      await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)
      // We execute the proposals
      for (let i = 1; i <= 3; i++) {
        await convictionVoting.executeProposal(i, false, { from: user })
      }
      await convictionVoting.addProposal('Proposal 4', '0x', 1000, appManager, {from: appManager})
      // We can stake all tokens on proposal 4
      await convictionVoting.stakeToProposal(4, 30000, {from: appManager})
      await convictionVoting.stakeToProposal(4, 7500, {from: user})
      await convictionVoting.stakeToProposal(4, 7500, {from: user})
    })

    it('should not count tokens as staked when they have been transfered', async () => {
      const id1 = getEventArgument(
        await convictionVoting.addProposal(`Proposal 1`, '0x', 1000, appManager, {from: appManager,}), 'ProposalAdded', 'id')
      const id2 = getEventArgument(
        await convictionVoting.addProposal(`Proposal 2`, '0x', 1000, appManager, {from: appManager,}), 'ProposalAdded', 'id')

      await convictionVoting.stakeToProposal(id1, 10000, {from: appManager,})
      await convictionVoting.stakeToProposal(id2, 20000, {from: appManager,})
      // +10 blocks
      await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)
      await stakeToken.transfer(user, 5000, {from: appManager,})

      // +10 blocks
      await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)
      await stakeToken.transfer(user, 10000, {from: appManager,})

      await convictionVoting.stakeToProposal(id1, 25000, {from: user,})
      await convictionVoting.stakeToProposal(id2, 5000, {from: user,})
      assert.equal((await convictionVoting.getProposal(id1))[3].toNumber(), 51145, `Proposal ${id1} conviction does not match expectations`)
      assert.equal((await convictionVoting.getProposal(id2))[3].toNumber(), 174547, `Proposal ${id1} conviction does not match expectations`
      )
    })
  })

  context.only('Disputable functions', () => {

    let proposalId, actionId

    beforeEach(async () => {
      await deploy()
      const addProposalReceipt = await convictionVoting.addProposal('Proposal 1', '0x', 1000, appManager, {from: appManager})
      proposalId = getEventArgument(addProposalReceipt, 'ProposalAdded', 'id')
      actionId = getEventArgument(addProposalReceipt, 'ProposalAdded', 'actionId')
    })

    describe('canChallenge(uint256 _proposalId)', () => {
      it('returns true when vote not challenged', async () => {
        const canChallenge = await convictionVoting.canChallenge(proposalId)

        assert.isTrue(canChallenge)
      })

      it('returns false when vote has been challenged', async () => {
        await agreement.challenge({ actionId })

        const canChallenge = await convictionVoting.canChallenge(proposalId)

        assert.isFalse(canChallenge)
      })

      it('returns true when vote has reached threshold but not been executed', async () => {
        await convictionVoting.stakeToProposal(proposalId, 15000, {from: appManager})
        await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)

        const canChallenge = await convictionVoting.canChallenge(proposalId)

        assert.isTrue(canChallenge)
      })

      it('returns false when vote has been executed', async () => {
        await convictionVoting.stakeToProposal(proposalId, 15000, {from: appManager})
        await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)
        await convictionVoting.executeProposal(proposalId, false, { from: user })

        const canChallenge = await convictionVoting.canChallenge(proposalId)

        assert.isFalse(canChallenge)
      })
    })

    describe('canClose(uint256 _proposalId)', () => {
      it('returns false when vote not executed or cancelled', async () => {
        const canClose = await convictionVoting.canClose(proposalId)

        assert.isFalse(canClose)
      })

      it('returns false when vote has been challenged', async () => {
        await agreement.challenge({ actionId })

        const canClose = await convictionVoting.canClose(proposalId)

        assert.isFalse(canClose)
      })

      it('returns true when vote has been cancelled', async () => {
        await agreement.challenge({ actionId })
        await agreement.dispute({ actionId })
        await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })

        const canClose = await convictionVoting.canClose(proposalId)

        assert.isTrue(canClose)
      })

      it('returns true when vote has been executed', async () => {
        await convictionVoting.stakeToProposal(proposalId, 15000, {from: appManager})
        await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)
        await convictionVoting.executeProposal(proposalId, false, { from: user })

        const canClose = await convictionVoting.canClose(proposalId)

        assert.isTrue(canClose)
      })
    })

    //
    // describe('_onDisputableActionChallenged(uint256 _proposalId)', () => {
    //   it('pauses execution script', async () => {
    //     const timestamp = await delay.getTimestampPublic()
    //
    //     await agreement.challenge({ actionId })
    //
    //     const { pausedAt, delayedScriptStatus } = await delay.delayedScripts(delayedScriptId)
    //     assert.closeTo(pausedAt.toNumber(), timestamp.toNumber(), 3)
    //     assert.equal(delayedScriptStatus, DELAYED_SCRIPT_STATUS.PAUSED)
    //   })
    //
    //   it('reverts when challenging non existent action', async () => {
    //     const incorrectActionId = 99
    //     await assertRevert(agreement.challenge({ actionId: incorrectActionId }), 'AGR_ACTION_DOES_NOT_EXIST')
    //   })
    //
    //   it('reverts when challenging already paused script execution', async () => {
    //     await agreement.challenge({ actionId })
    //     await assertRevert(agreement.challenge({ actionId }), 'AGR_CANNOT_CHALLENGE_ACTION')
    //   })
    //
    //   it('reverts when challenging script past execution time', async () => {
    //     await delay.mockIncreaseTime(DELAY_LENGTH)
    //     await assertRevert(agreement.challenge({ actionId }), 'AGR_CANNOT_CHALLENGE_ACTION')
    //   })
    //
    //   it('allows multiple challenges', async () => {
    //     await agreement.challenge({ actionId })
    //     await agreement.dispute({ actionId })
    //     await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
    //     const timestamp = await delay.getTimestampPublic()
    //
    //     await agreement.challenge({ actionId })
    //
    //     const { pausedAt, delayedScriptStatus } = await delay.delayedScripts(delayedScriptId)
    //     assert.closeTo(pausedAt.toNumber(), timestamp.toNumber(), 3) // Is not exact due to agreement.challenge() executing multiple transactions
    //     assert.equal(delayedScriptStatus, DELAYED_SCRIPT_STATUS.PAUSED)
    //   })
    // })
    //
    // describe('_onDisputableActionAllowed(uint256 _proposalId)', () => {
    //   it('resumes execution script', async () => {
    //     const timePaused = 50
    //     const { executionFromTime: oldExecutionFromTime } = await delay.delayedScripts(delayedScriptId)
    //
    //     await agreement.challenge({ actionId })
    //     await agreement.dispute({ actionId })
    //     await delay.mockIncreaseTime(timePaused)
    //     await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
    //
    //     const {
    //       executionFromTime: actualExecutionFromTime,
    //       pausedAt: actualPausedAt,
    //       delayedScriptStatus
    //     } = await delay.delayedScripts(delayedScriptId)
    //     assert.equal(actualPausedAt, 0)
    //     assert.closeTo(actualExecutionFromTime.toNumber(), oldExecutionFromTime.toNumber() + timePaused, 5)
    //     assert.equal(delayedScriptStatus, DELAYED_SCRIPT_STATUS.ACTIVE)
    //   })
    //
    //   it('reverts when disputing non existent script', async () => {
    //     const incorrectActionId = 99
    //     await assertRevert(agreement.dispute({ actionId }), 'AGR_CANNOT_DISPUTE_ACTION')
    //   })
    //
    //   it('reverts when attempting to reject after being allowed', async () => {
    //     await agreement.challenge({ actionId })
    //     await agreement.dispute({ actionId })
    //     await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
    //     await assertRevert(agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER }), 'AGR_CANNOT_RULE_ACTION')
    //   })
    // })
    //
    // describe('_onDisputableActionRejected(uint256 _proposalId)', () => {
    //   it('cancels execution script', async () => {
    //     await agreement.challenge({ actionId })
    //     await agreement.dispute({ actionId })
    //     await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
    //
    //     const {
    //       executionFromTime: actualExecutionFromTime,
    //       evmCallScript: actualCallScript,
    //       delayedScriptStatus
    //     } = await delay.delayedScripts(delayedScriptId)
    //
    //     assert.closeTo(actualExecutionFromTime.toNumber(), delayCreatedTimestamp.toNumber() + DELAY_LENGTH, 3)
    //     assert.equal(actualCallScript, script)
    //     assert.equal(delayedScriptStatus, DELAYED_SCRIPT_STATUS.CANCELLED)
    //   })
    //
    //   it('reverts when attempting to allow after being rejected', async () => {
    //     await agreement.challenge({ actionId })
    //     await agreement.dispute({ actionId })
    //     await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
    //     await assertRevert(agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER }), 'AGR_CANNOT_RULE_ACTION')
    //   })
    //
    //   it('closes the action', async () => {
    //     await agreement.challenge({ actionId })
    //     await agreement.dispute({ actionId })
    //     await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
    //
    //     const { closed } = await agreement.getAction(actionId)
    //     assert.isTrue(closed)
    //   })
    // })
    //
    // describe('_onDisputableActionVoided(uint256 _proposalId)', async () => {
    //   it('resumes execution script', async () => {
    //     const timePaused = 50
    //     const { executionFromTime: oldExecutionFromTime } = await delay.delayedScripts(delayedScriptId)
    //
    //     await agreement.challenge({ actionId })
    //     await agreement.dispute({ actionId })
    //     await delay.mockIncreaseTime(timePaused)
    //     await agreement.executeRuling({ actionId, ruling: RULINGS.REFUSED })
    //
    //     const {
    //       executionFromTime: actualExecutionFromTime,
    //       pausedAt: actualPausedAt,
    //       delayedScriptStatus
    //     } = await delay.delayedScripts(delayedScriptId)
    //     assert.equal(actualPausedAt, 0)
    //     assert.closeTo(actualExecutionFromTime.toNumber(), oldExecutionFromTime.toNumber() + timePaused, 5)
    //     assert.equal(delayedScriptStatus, DELAYED_SCRIPT_STATUS.ACTIVE)
    //   })
    // })
    //
    // describe('execute(uint256 _proposalId)', () => {
    //   it('executes the script after the delay has elapsed', async () => {
    //     await delay.mockIncreaseTime(DELAY_LENGTH)
    //
    //     await delay.execute(delayedScriptId)
    //     const actualExecutionCounter = await executionTarget.counter()
    //     const {
    //       executionFromTime: actualExecutionFromTime,
    //       evmCallScript: actualCallScript,
    //       delayedScriptStatus
    //     } = await delay.delayedScripts(delayedScriptId)
    //
    //     assert.equal(actualExecutionCounter, 1)
    //     assert.closeTo(actualExecutionFromTime.toNumber(), delayCreatedTimestamp.toNumber() + DELAY_LENGTH, 3)
    //     assert.equal(actualCallScript, script)
    //     assert.equal(delayedScriptStatus, DELAYED_SCRIPT_STATUS.EXECUTED)
    //   })
    //
    //   it('executes the script after execution is resumed', async () => {
    //     await agreement.challenge({ actionId })
    //     await agreement.dispute({ actionId })
    //     await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
    //
    //     await delay.mockIncreaseTime(DELAY_LENGTH)
    //     await delay.execute(delayedScriptId)
    //   })
    //
    //   it('reverts when script does not exist', async () => {
    //     const incorrectScriptId = 99
    //     await assertRevert(delay.execute(incorrectScriptId), 'DELAY_CANNOT_EXECUTE')
    //   })
    //
    //   it('reverts when executing script before execution time', async () => {
    //     await assertRevert(delay.execute(delayedScriptId), 'DELAY_CANNOT_EXECUTE')
    //   })
    //
    //   it('reverts when executing paused script', async () => {
    //     await agreement.challenge({ actionId })
    //     await delay.mockIncreaseTime(DELAY_LENGTH)
    //     await assertRevert(delay.execute(delayedScriptId), 'DELAY_CANNOT_EXECUTE')
    //   })
    //
    //   it('reverts when executing cancelled script', async () => {
    //     await agreement.challenge({ actionId })
    //     await agreement.dispute({ actionId })
    //     await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
    //     await delay.mockIncreaseTime(DELAY_LENGTH)
    //
    //     await assertRevert(delay.execute(delayedScriptId), 'DELAY_CANNOT_EXECUTE')
    //   })
    //
    //   it('reverts when evmScript reenters delay contract, attempting to execute same script twice', async () => {
    //     const action = {
    //       to: delay.address,
    //       calldata: delay.contract.methods.execute(1).encodeABI(),
    //     }
    //     const reenteringScript = encodeCallScript([action])
    //
    //     const delayReceipt = await delay.delayExecution("0x", reenteringScript)
    //
    //     const scriptId = getEventArgument(delayReceipt, 'DelayedScriptStored', 'delayedScriptId')
    //     await delay.mockIncreaseTime(DELAY_LENGTH)
    //     await assertRevert(delay.execute(scriptId), 'REENTRANCY_REENTRANT_CALL')
    //   })
    //
    //   it('reverts when evmScript calls function on Agreements contract', async () => {
    //     const action = {
    //       to: agreement.address,
    //       calldata: agreement.agreement.contract.methods.getDisputableInfo(delay.address).encodeABI(),
    //     }
    //     const agreementScript = encodeCallScript([action])
    //
    //     const delayReceipt = await delay.delayExecution("0x", agreementScript)
    //
    //     const scriptId = getEventArgument(delayReceipt, 'DelayedScriptStored', 'delayedScriptId')
    //     await delay.mockIncreaseTime(DELAY_LENGTH)
    //     await assertRevert(delay.execute(scriptId), 'EVMCALLS_BLACKLISTED_CALL')
    //   })
    //
    //   it('closes the agreement action', async () => {
    //     const { closed: closedBefore } = await agreement.getAction(actionId)
    //     await delay.mockIncreaseTime(DELAY_LENGTH)
    //
    //     await delay.execute(delayedScriptId)
    //
    //     const { closed: closedAfter } = await agreement.getAction(actionId)
    //     assert.isFalse(closedBefore)
    //     assert.isTrue(closedAfter)
    //   })
    // })
    //
    // describe('closeAgreementAction(uint256 _proposalId)', () => {
    //   it('closes the agreement action', async () => {
    //     const { closed: closedBefore } = await agreement.getAction(actionId)
    //     await delay.mockIncreaseTime(DELAY_LENGTH)
    //
    //     await delay.closeAgreementAction(delayedScriptId)
    //
    //     const { closed: closedAfter } = await agreement.getAction(actionId)
    //     assert.isFalse(closedBefore)
    //     assert.isTrue(closedAfter)
    //   })
    //
    //   it('reverts when cannot execute', async () => {
    //     await assertRevert(delay.closeAgreementAction(delayedScriptId), "DELAY_CANNOT_CLOSE")
    //   })
    //
    //   it('reverts when already closed', async () => {
    //     await delay.mockIncreaseTime(DELAY_LENGTH)
    //     await delay.closeAgreementAction(delayedScriptId)
    //     await assertRevert(delay.closeAgreementAction(delayedScriptId), "AGR_CANNOT_CLOSE_ACTION")
    //   })
    //
    //   describe('execute(uint256 _proposalId)', () => {
    //     it('succeeds when action already closed', async () => {
    //       await delay.mockIncreaseTime(DELAY_LENGTH)
    //       await delay.closeAgreementAction(delayedScriptId)
    //
    //       await delay.execute(delayedScriptId)
    //
    //       const actualExecutionCounter = await executionTarget.counter()
    //       const {
    //         executionFromTime: actualExecutionFromTime,
    //         evmCallScript: actualCallScript,
    //         delayedScriptStatus
    //       } = await delay.delayedScripts(delayedScriptId)
    //       assert.equal(actualExecutionCounter, 1)
    //       assert.closeTo(actualExecutionFromTime.toNumber(), delayCreatedTimestamp.toNumber() + DELAY_LENGTH, 3)
    //       assert.equal(actualCallScript, script)
    //       assert.equal(delayedScriptStatus, DELAYED_SCRIPT_STATUS.EXECUTED)
    //     })
    //   })
    // })
  })
})
