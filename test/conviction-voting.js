/* global artifacts contract before beforeEach context it assert web3 */

const { getEventArgument } = require('@aragon/contract-helpers-test/events')
const { assertRevert } = require('@aragon/apps-agreement/test/helpers/assert/assertThrow')
const { RULINGS } = require('@aragon/apps-agreement/test/helpers/utils/enums')
const deployDAO = require('./helpers/deployDAO')
const installApp = require('./helpers/installApp')
const timeAdvancer = require('./helpers/timeAdvancer')
const deployer = require('@aragon/apps-agreement/test/helpers/utils/deployer')(web3, artifacts)

const ConvictionVoting = artifacts.require('ConvictionVotingMock')
const HookedTokenManager = artifacts.require('HookedTokenManager')
const MiniMeToken = artifacts.require('MiniMeToken')
const VaultMock = artifacts.require('VaultMock')

const BN = web3.utils.toBN
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ANY_ADDRESS = '0xffffffffffffffffffffffffffffffffffffffff'
const ONE_DAY = 60 * 60 * 24
const D = 10 ** 7
const DEFAULT_ALPHA = 0.9 * D
const DEFAULT_BETA = 0.2 * D
const DEFAULT_RHO = 0.002 * D
const DEFAULT_APP_MANAGER_STAKE_TOKENS = 30000
const DEFAULT_USER_STAKE_TOKENS = 15000

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

contract('ConvictionVoting', ([appManager, user, beneficiary]) => {
  let convictionVoting, stakeToken, requestToken, vault, agreement, collateralToken
  const acc = { [appManager]: 'appManager', [user]: 'user' } // TODO: Can remove?

  before(async () => {
    agreement = await deployer.deployAndInitializeWrapper({ appManager })
    collateralToken = await deployer.deployCollateralToken()
    await agreement.sign(appManager)
    await agreement.sign(user, { from: user })
  })

  const deploy = async (
    decimals = 1,
    [appManagerTokens, userTokens] = [DEFAULT_APP_MANAGER_STAKE_TOKENS, DEFAULT_USER_STAKE_TOKENS],
    vaultFunds = 15000,
    alpha = DEFAULT_ALPHA,
    beta = DEFAULT_BETA,
    rho = DEFAULT_RHO
  ) => {

    // ERC20 accepts `decimals`. In order to create token with 45000 total supply
    // we provide `1` as `decimals` and `initialSupply` as 4500. So we get 4500*(10**1) total supply.
    stakeToken = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'stakeToken', decimals, 'TKN', true)

    const tokenManager = await installApp(deployer.dao, deployer.acl, HookedTokenManager, [[ANY_ADDRESS, 'MINT_ROLE'], [ANY_ADDRESS, 'SET_HOOK_ROLE']], appManager)
    await stakeToken.changeController(tokenManager.address)
    await tokenManager.initialize(stakeToken.address, true, 0)
    await tokenManager.mint(appManager, appManagerTokens)
    await tokenManager.mint(user, userTokens)

    vault = await VaultMock.new({ from: appManager })
    requestToken = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'DAI', 18, 'DAI', true)
    await requestToken.generateTokens(vault.address, vaultFunds)

    convictionVoting = await installApp(deployer.dao, deployer.acl, ConvictionVoting, [[ANY_ADDRESS, 'CREATE_PROPOSALS_ROLE']], appManager)
    await convictionVoting.initialize(stakeToken.address, vault.address, requestToken.address, alpha, beta, rho) // alpha = 0.9, beta = 0.2, rho = 0.002
    await tokenManager.registerHook(convictionVoting.address)

    const SetAgreementRole = await convictionVoting.SET_AGREEMENT_ROLE()
    await deployer.acl.createPermission(agreement.address, convictionVoting.address, SetAgreementRole, appManager)
    const ChallengeRole = await deployer.base.CHALLENGE_ROLE()
    await deployer.acl.createPermission(ANY_ADDRESS, convictionVoting.address, ChallengeRole, appManager)
    await agreement.activate({
      disputable: convictionVoting,
      collateralToken,
      actionCollateral: 0,
      challengeCollateral: 0,
      challengeDuration: ONE_DAY,
      from: appManager
    })
  }

  context.only('initialize(MiniMeToken _stakeToken, Vault _vault, address _requestToken, uint256 _decay, uint256 _maxRatio, ' +
    'uint256 _weight)', () => {

    // Note these tests use a before for deployment, they must be executed in order.
    beforeEach('deploy dao and convictionVoting', async () => {
      await deploy()
    })

    it('sets fields correctly', async () => {
      assert.isTrue(await convictionVoting.hasInitialized(), 'Not initialised')
      assert.equal(await convictionVoting.proposalCounter(), 1, 'Incorrect proposal counter')
      assert.equal(await convictionVoting.stakeToken(), stakeToken.address, 'Incorrect stake token')
      assert.equal(await convictionVoting.requestToken(), requestToken.address, 'Incorrect request token')
      assert.equal(await convictionVoting.vault(), vault.address, 'Incorrect vault token')
      assert.equal(await convictionVoting.decay(), DEFAULT_ALPHA, 'Incorrect decay')
      assert.equal(await convictionVoting.maxRatio(), DEFAULT_BETA, 'Incorrect max ratio')
      assert.equal(await convictionVoting.weight(), DEFAULT_RHO, 'Incorrect weight')
    })

    context('addProposal(string _title, bytes _link, uint256 _requestedAmount, address _beneficiary)', () => {

      let proposalId, actionId
      const requestedAmount = 1000

      beforeEach(async () => {
        const addProposalReceipt = await convictionVoting.addProposal('Proposal 1', '0x', requestedAmount, beneficiary)
        proposalId = getEventArgument(addProposalReceipt, 'ProposalAdded', 'id')
        actionId = getEventArgument(addProposalReceipt, 'ProposalAdded', 'actionId')
      })

      it('should create a proposal', async () => {
        const {
          requestedAmount: actualRequestedAmount,
          beneficiary: actualBeneficiary,
          stakedTokens,
          convictionLast,
          blockLast,
          agreementActionId,
          proposalStatus,
          submitter
        } = await convictionVoting.getProposal(proposalId)

        assert.equal(actualRequestedAmount, requestedAmount, 'Incorrect requested amount')
        assert.equal(beneficiary, beneficiary, 'Incorrect beneficiary')
        assert.equal(stakedTokens, 0, 'Incorrect staked tokens')
        assert.equal(convictionLast, 0, 'Incorrect conviction last')
        assert.equal(blockLast, 0, 'Incorrect block last')
        assert.equal(agreementActionId, 1, 'Incorrect action ID')
        assert.equal(proposalStatus, PROPOSAL_STATUS.ACTIVE, 'Incorrect proposal status')
        assert.equal(submitter, appManager, 'Incorrect submitter')
        assert.equal(await convictionVoting.proposalCounter(), 2)
      })

      const assertProposalAndStakesCorrect =
        async (proposalId, convictionLast, proposalStake, blockLast, proposalAppManagerStake, totalAppManagerStake) => {
          const { stakedTokens: actualProposalStake, convictionLast: actualConvictionLast, blockLast: actualBlockLast } =
            await convictionVoting.getProposal(proposalId)
          const actualProposalAppManagerStake = await convictionVoting.getProposalVoterStake(proposalId, appManager)
          const actualTotalAppManagerStake = await convictionVoting.getTotalVoterStake(appManager)
          assert.equal(actualConvictionLast.toNumber(), convictionLast, 'Incorrect conviction last')
          assert.equal(actualProposalStake.toNumber(), proposalStake, 'Incorrect proposal stake amount')
          assert.equal(actualBlockLast.toNumber(), blockLast, 'Incorrect block last')
          assert.equal(actualProposalAppManagerStake.toString(), proposalAppManagerStake, 'Incorrect proposal voter stake')
          assert.equal(actualTotalAppManagerStake.toString(), totalAppManagerStake, 'Incorrect total voter stake')
        }

      context('stakeToProposal(uint256 _proposalId, uint256 _amount)', () => {

        it('should stake to proposal', async () => {
          const stakeAmount = 1000
          const { stakedTokens: stakedBefore } = await convictionVoting.getProposal(proposalId)
          const currentBlock = await convictionVoting.getBlockNumberPublic()

          await convictionVoting.stakeToProposal(proposalId, stakeAmount)

          await assertProposalAndStakesCorrect(
            proposalId, 0, stakedBefore.toNumber() + stakeAmount,
            currentBlock.toNumber() + 1, stakeAmount, stakeAmount)
        })

        it('should allow staking from multiple accounts', async () => {
          const stakeAmount = 1000

          await convictionVoting.stakeToProposal(proposalId, stakeAmount, { from: appManager })
          await convictionVoting.mockAdvanceBlocks(10)
          const currentBlock = await convictionVoting.getBlockNumberPublic()
          await convictionVoting.stakeToProposal(proposalId, stakeAmount, { from: user })

          await assertProposalAndStakesCorrect(
            proposalId, 6862, stakeAmount * 2,
            currentBlock.toNumber(), stakeAmount, stakeAmount)
        })

        it('should allow staking multiple times', async () => {
          const stakeAmount = 1000
          const { stakedTokens: stakedBefore } = await convictionVoting.getProposal(proposalId)
          await convictionVoting.stakeToProposal(proposalId, stakeAmount)
          const currentBlock = await convictionVoting.getBlockNumberPublic()

          await convictionVoting.stakeToProposal(proposalId, stakeAmount)

          await assertProposalAndStakesCorrect(
            proposalId, 1000,  stakeAmount * 2, currentBlock.toNumber() + 1,
            stakeAmount * 2, stakeAmount * 2)
        })

        it('should reassign previously staked tokens after previous vote execution', async () => {
          await convictionVoting.stakeToProposal(proposalId, DEFAULT_APP_MANAGER_STAKE_TOKENS)
          await convictionVoting.mockAdvanceBlocks(40)
          await convictionVoting.executeProposal(proposalId, false)
          const addProposalReceipt = await convictionVoting.addProposal('Proposal 2', '0x', requestedAmount, beneficiary)
          const proposal2Id = getEventArgument(addProposalReceipt, 'ProposalAdded', 'id')
          const currentBlock = await convictionVoting.getBlockNumberPublic()

          await convictionVoting.stakeToProposal(proposal2Id, DEFAULT_APP_MANAGER_STAKE_TOKENS)

          await assertProposalAndStakesCorrect(
            proposal2Id, 0, DEFAULT_APP_MANAGER_STAKE_TOKENS, currentBlock,
            DEFAULT_APP_MANAGER_STAKE_TOKENS, DEFAULT_APP_MANAGER_STAKE_TOKENS)
        })

        const createAndExecuteProposals = async (numberOfProposals, stakeForProposals) => {
          let newProposalIds = []
          for (let i = 0; i < numberOfProposals; i++) {
            const addNewProposalReceipt = await convictionVoting.addProposal('Proposal', '0x', 100, beneficiary)
            const newProposalId = getEventArgument(addNewProposalReceipt, 'ProposalAdded', 'id')
            await convictionVoting.stakeToProposal(newProposalId, stakeForProposals)
            newProposalIds.push(newProposalId.toNumber())
          }

          await convictionVoting.mockAdvanceBlocks(40)

          for (const newProposalId of newProposalIds) {
            await convictionVoting.executeProposal(newProposalId, false)
          }
        }

        it('should reassign previously staked tokens after multiple previous votes execution', async () => {
          await createAndExecuteProposals(2, DEFAULT_APP_MANAGER_STAKE_TOKENS / 2)
          const addProposalReceipt = await convictionVoting.addProposal('Proposal', '0x', requestedAmount, beneficiary)
          const proposalId = getEventArgument(addProposalReceipt, 'ProposalAdded', 'id')
          const currentBlock = await convictionVoting.getBlockNumberPublic()

          await convictionVoting.stakeToProposal(proposalId, DEFAULT_APP_MANAGER_STAKE_TOKENS)

          await assertProposalAndStakesCorrect(
            proposalId, 0, DEFAULT_APP_MANAGER_STAKE_TOKENS, currentBlock,
            DEFAULT_APP_MANAGER_STAKE_TOKENS, DEFAULT_APP_MANAGER_STAKE_TOKENS)
        })

        it('should reassign previously staked tokens after many previous votes executions', async () => {
          await createAndExecuteProposals(10, DEFAULT_APP_MANAGER_STAKE_TOKENS / 10)
          const addProposalReceipt = await convictionVoting.addProposal('Proposal', '0x', requestedAmount, beneficiary)
          const proposalId = getEventArgument(addProposalReceipt, 'ProposalAdded', 'id')
          const currentBlock = await convictionVoting.getBlockNumberPublic()

          await convictionVoting.stakeToProposal(proposalId, DEFAULT_APP_MANAGER_STAKE_TOKENS)

          await assertProposalAndStakesCorrect(
            proposalId, 0, DEFAULT_APP_MANAGER_STAKE_TOKENS, currentBlock,
            DEFAULT_APP_MANAGER_STAKE_TOKENS, DEFAULT_APP_MANAGER_STAKE_TOKENS)
        })

        it('should not reassign previously staked tokens before previous vote execution', async () => {
          await convictionVoting.stakeToProposal(proposalId, DEFAULT_APP_MANAGER_STAKE_TOKENS)
          await convictionVoting.mockAdvanceBlocks(40)
          const addProposalReceipt = await convictionVoting.addProposal('Proposal 2', '0x', requestedAmount, beneficiary)
          const proposal2Id = getEventArgument(addProposalReceipt, 'ProposalAdded', 'id')

          await assertRevert(convictionVoting.stakeToProposal(proposal2Id, DEFAULT_APP_MANAGER_STAKE_TOKENS), 'CV_STAKING_MORE_THAN_AVAILABLE')
        })

        it('should revert when staked amount is 0', async () => {
          await assertRevert(convictionVoting.stakeToProposal(proposalId, 0), 'CV_AMOUNT_CAN_NOT_BE_ZERO')
        })

        it('should revert when stake amount is more than owned', async () => {
          await assertRevert(convictionVoting.stakeToProposal(proposalId, 1000000), 'CV_STAKING_MORE_THAN_AVAILABLE')
        })

        it('should revert when challenged', async () => {
          await agreement.challenge({ actionId })

          await assertRevert(convictionVoting.stakeToProposal(proposalId, 1000), 'CV_PROPOSAL_NOT_ACTIVE')
        })

        it('should revert when cancelled', async () => {
          await agreement.challenge({ actionId })
          await agreement.dispute({ actionId })
          await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })

          await assertRevert(convictionVoting.stakeToProposal(proposalId, 1000), 'CV_PROPOSAL_NOT_ACTIVE')
        })

        it('should revert when executed', async () => {
          await convictionVoting.stakeToProposal(proposalId, 6000)
          await convictionVoting.mockAdvanceBlocks(80)
          await convictionVoting.executeProposal(proposalId, false)

          await assertRevert(convictionVoting.stakeToProposal(proposalId, 1000), 'CV_PROPOSAL_NOT_ACTIVE')
        })

        context('withdrawFromProposal(uint256 _proposalId, uint256 _amount)', () => {

          const stakeAmount = 1000

          beforeEach(async () => {
            await convictionVoting.stakeToProposal(proposalId, stakeAmount, { from: appManager })
          })

          it('withdraws from proposal', async () => {
            const withdrawAmount = 500
            await convictionVoting.mockAdvanceBlocks(40)
            const { stakedTokens: stakedBefore } = await convictionVoting.getProposal(proposalId)
            const currentBlock = await convictionVoting.getBlockNumberPublic()

            await convictionVoting.withdrawFromProposal(proposalId, withdrawAmount)

            await assertProposalAndStakesCorrect(
              proposalId, 9867, stakedBefore - withdrawAmount, currentBlock.toNumber(),
              stakeAmount - withdrawAmount, stakeAmount - withdrawAmount)
          })

          it('does not update block last or conviction last when executed', async () => {
            await convictionVoting.stakeToProposal(proposalId, 4000)
            await convictionVoting.stakeToProposal(proposalId, 2000, { from: user })
            await convictionVoting.mockAdvanceBlocks(80)
            await convictionVoting.executeProposal(proposalId, false)
            const { convictionLast: convictionBefore, blockLast: blockLastBefore } = await convictionVoting.getProposal(proposalId)

            await convictionVoting.withdrawFromProposal(proposalId, 1000, { from: user })

            const { convictionLast: convictionAfter, blockLast: blockLastAfter } = await convictionVoting.getProposal(proposalId)
            assert.equal(blockLastAfter.toString(), blockLastBefore.toString(), 'Incorrect block last')
            assert.equal(convictionAfter.toString(), convictionBefore.toString(), 'Incorrect conviction')
          })

          it('reverts when withdrawing more than staked', async () => {
            await assertRevert(convictionVoting.withdrawFromProposal(proposalId, stakeAmount + 1), 'CV_WITHDRAW_MORE_THAN_STAKED')
          })

          it('reverts when withdrawing 0', async () => {
            await assertRevert(convictionVoting.withdrawFromProposal(proposalId, 0), 'CV_AMOUNT_CAN_NOT_BE_ZERO')
          })
        })

        context('withdrawAllFromProposal(uint256 _proposalId)', () => {
          it('withdraws all from proposal', async () => {
            const stakeAmount = 1000
            await convictionVoting.stakeToProposal(proposalId, stakeAmount)
            const { stakedTokens: stakedBefore } = await convictionVoting.getProposal(proposalId)
            const currentBlock = await convictionVoting.getBlockNumberPublic()

            await convictionVoting.withdrawAllFromProposal(proposalId)

            await assertProposalAndStakesCorrect(
              proposalId, 1000, stakedBefore.toNumber() - stakeAmount,
              currentBlock.toNumber() + 1, 0, 0)
          })
        })
      })

      context('stakeAllToProposal(uint256 _proposalId)', () => {
        it('should stake entire balance to proposal', async () => {
          const stakeAmount = await stakeToken.balanceOf(appManager)
          const { stakedTokens: stakedBefore } = await convictionVoting.getProposal(proposalId)
          const currentBlock = await convictionVoting.getBlockNumberPublic()

          await convictionVoting.stakeAllToProposal(proposalId)

          await assertProposalAndStakesCorrect(
            proposalId, 0, stakedBefore.toNumber() + stakeAmount,
            currentBlock.toNumber() + 1, stakeAmount, stakeAmount)
        })

        it('should revert when already staked', async () => {
          await convictionVoting.stakeToProposal(proposalId, 1000)
          await assertRevert(convictionVoting.stakeAllToProposal(proposalId), 'CV_STAKING_ALREADY_STAKED')
        })
      })
    })
  })

  context('Typical usage', () => {

    // Note these tests use a before for deployment, they must be executed in order.
    before('deploy dao and convictionVoting', async () => {
      await deploy()
    })

    for (let i = 1; i <= 2; i++) {
      context(`Proposal ${i} (${i * 1000} DAI)`, () => {
        it('should create proposals', async () => {
          const title = `Proposal ${i}`
          const receipt = await convictionVoting.addProposal(title, '0x', i * 1000, user, {
            from: appManager
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
            await assertRevert(convictionVoting.stakeToProposal(i, 0, { from: account }), 'CV_AMOUNT_CAN_NOT_BE_ZERO')
            await assertRevert(convictionVoting.stakeToProposal(i, 1000000, { from: account }), 'CV_STAKING_MORE_THAN_AVAILABLE')

            const receipt = await convictionVoting.stakeToProposal(i, stakesPerAccount, { from: account })
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

          const receipt = await convictionVoting.withdrawFromProposal(i, withdrawAmount, { from: appManager })
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

          const receipt = await convictionVoting.stakeToProposal(i, stakesPerUser, { from: user })
          assert.equal((await convictionVoting.getProposal(i))[3].toNumber(), 12708, 'Conviction does not match expectations')

          assert.equal(getEventArgument(receipt, 'StakeAdded', 'totalTokensStaked').toNumber(), currentlyStaked.toNumber() + stakesPerUser)
          assert.equal(getEventArgument(receipt, 'StakeAdded', 'tokensStaked').toNumber(), currentlyStaked.toNumber() + stakesPerUser)
        })

        if (i === 1) {
          it(`should enact proposal`, async () => {
            // assume that 1 block ~ 15 seconds
            // +40 blocks
            await timeAdvancer.advanceTimeAndBlocksBy(15 * 40, 40)
            await convictionVoting.executeProposal(i, false, { from: user })
            const proposal = await convictionVoting.getProposal(i)
            assert.equal(proposal[3].toNumber(), 69238, 'Conviction does not match expectations')
            assert.equal(proposal[6], PROPOSAL_STATUS.EXECUTED, 'Proposal not marked as executed')
            assert.equal((await requestToken.balanceOf(vault.address)).toNumber(), 14000, 'Incorrect amount of money sent')
          })

          it('should not enact same proposal second time', async () => {
            await assertRevert(convictionVoting.executeProposal(i, false, { from: user }), 'CV_PROPOSAL_NOT_ACTIVE')
          })
        } else {
          it(`should fail enacting proposal`, async () => {
            // assume that 1 block ~ 15 seconds
            // +40 blocks
            await timeAdvancer.advanceTimeAndBlocksBy(15 * 40, 40)
            await assertRevert(convictionVoting.executeProposal(i, false, { from: user }), 'CV_INSUFFICIENT_CONVICION')
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
            0.9999599 * D,
            0.2 * D,
            0.002 * D
          )
        }
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
        await convictionVoting.addProposal(`Proposal ${i}`, '0x', 1000, appManager, { from: appManager })
        await convictionVoting.stakeToProposal(i, 10000, { from: appManager })
        await convictionVoting.stakeToProposal(i, 5000, { from: user })
      }
      // +10 blocks
      await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)
      // We execute the proposals
      for (let i = 1; i <= 3; i++) {
        await convictionVoting.executeProposal(i, false, { from: user })
      }
      await convictionVoting.addProposal('Proposal 4', '0x', 1000, appManager, { from: appManager })
      // We can stake all tokens on proposal 4
      await convictionVoting.stakeToProposal(4, 30000, { from: appManager })
      await convictionVoting.stakeToProposal(4, 7500, { from: user })
      await convictionVoting.stakeToProposal(4, 7500, { from: user })
    })

    it('should not count tokens as staked when they have been transfered', async () => {
      const id1 = getEventArgument(
        await convictionVoting.addProposal(`Proposal 1`, '0x', 1000, appManager, { from: appManager }), 'ProposalAdded', 'id')
      const id2 = getEventArgument(
        await convictionVoting.addProposal(`Proposal 2`, '0x', 1000, appManager, { from: appManager }), 'ProposalAdded', 'id')

      await convictionVoting.stakeToProposal(id1, 10000, { from: appManager })
      await convictionVoting.stakeToProposal(id2, 20000, { from: appManager })
      // +10 blocks
      await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)
      await stakeToken.transfer(user, 5000, { from: appManager })

      // +10 blocks
      await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)
      await stakeToken.transfer(user, 10000, { from: appManager })

      await convictionVoting.stakeToProposal(id1, 25000, { from: user })
      await convictionVoting.stakeToProposal(id2, 5000, { from: user })
      assert.equal((await convictionVoting.getProposal(id1))[3].toNumber(), 51145, `Proposal ${id1} conviction does not match expectations`)
      assert.equal((await convictionVoting.getProposal(id2))[3].toNumber(), 174547, `Proposal ${id1} conviction does not match expectations`
      )
    })
  })

  context('Disputable functions', () => {

    let proposalId, actionId

    beforeEach(async () => {
      await deploy()
      const addProposalReceipt = await convictionVoting.addProposal('Proposal 1', '0x', 1000, appManager, { from: appManager })
      proposalId = getEventArgument(addProposalReceipt, 'ProposalAdded', 'id')
      actionId = getEventArgument(addProposalReceipt, 'ProposalAdded', 'actionId')
    })

    describe('canChallenge(uint256 _proposalId)', () => {
      it('returns true when vote not challenged', async () => {
        const canChallenge = await convictionVoting.canChallenge(proposalId)

        assert.isTrue(canChallenge)
      })

      it('returns true when vote challenged and allowed (ensures we can challenge multiple times)', async () => {
        await agreement.challenge({ actionId })
        await agreement.dispute({ actionId })
        await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })

        const canChallenge = await convictionVoting.canChallenge(proposalId)

        assert.isTrue(canChallenge)
      })

      it('returns false when vote has been challenged', async () => {
        await agreement.challenge({ actionId })

        const canChallenge = await convictionVoting.canChallenge(proposalId)

        assert.isFalse(canChallenge)
      })

      it('returns true when vote has reached threshold but not been executed', async () => {
        await convictionVoting.stakeToProposal(proposalId, 15000, { from: appManager })
        await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)

        const canChallenge = await convictionVoting.canChallenge(proposalId)

        assert.isTrue(canChallenge)
      })

      it('returns false when vote has been executed', async () => {
        await convictionVoting.stakeToProposal(proposalId, 15000, { from: appManager })
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
        await convictionVoting.stakeToProposal(proposalId, 15000, { from: appManager })
        await timeAdvancer.advanceTimeAndBlocksBy(15 * 10, 10)
        await convictionVoting.executeProposal(proposalId, false, { from: user })

        const canClose = await convictionVoting.canClose(proposalId)

        assert.isTrue(canClose)
      })
    })

    describe('_onDisputableActionChallenged(uint256 _proposalId)', () => {
      it('pauses vote', async () => {
        await agreement.challenge({ actionId })

        const { proposalStatus } = await convictionVoting.getProposal(proposalId)
        assert.equal(proposalStatus, PROPOSAL_STATUS.PAUSED)
      })
    })

    describe('_onDisputableActionRejected(uint256 _proposalId)', () => {
      it('cancels the proposal', async () => {
        await agreement.challenge({ actionId })
        await agreement.dispute({ actionId })
        await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })

        const { proposalStatus } = await convictionVoting.getProposal(proposalId)
        assert.equal(proposalStatus, PROPOSAL_STATUS.CANCELLED)
      })
    })

    describe('_onDisputableActionAllowed(uint256 _proposalId)', () => {
      it('resumes execution script', async () => {
        await agreement.challenge({ actionId })
        await agreement.dispute({ actionId })
        await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })

        const { proposalStatus } = await convictionVoting.getProposal(proposalId)
        assert.equal(proposalStatus, PROPOSAL_STATUS.ACTIVE)
      })
    })

    describe('_onDisputableActionVoided(uint256 _proposalId)', async () => {
      it('resumes execution script', async () => {
        await agreement.challenge({ actionId })
        await agreement.dispute({ actionId })
        await agreement.executeRuling({ actionId, ruling: RULINGS.REFUSED })

        const { proposalStatus } = await convictionVoting.getProposal(proposalId)
        assert.equal(proposalStatus, PROPOSAL_STATUS.ACTIVE)
      })
    })
  })
})
