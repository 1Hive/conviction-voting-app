/* global artifacts contract before beforeEach context it assert web3 */

const { getEventArgument, ZERO_ADDRESS, ONE_DAY, bn } = require('@aragon/contract-helpers-test')
const { assertRevert } = require('@aragon/contract-helpers-test/src/asserts/assertThrow')
const { RULINGS } = require('@aragon/apps-agreement/test/helpers/utils/enums')
const installApp = require('./helpers/installApp')
const deployer = require('@aragon/apps-agreement/test/helpers/utils/deployer')(web3, artifacts)

const ConvictionVoting = artifacts.require('ConvictionVotingMock')
const HookedTokenManager = artifacts.require('HookedTokenManager')
const MiniMeToken = artifacts.require('MiniMeToken')
const VaultMock = artifacts.require('VaultMock')

const ONE_HUNDRED_PERCENT = 1e18
const ANY_ADDRESS = '0xffffffffffffffffffffffffffffffffffffffff'
const D = 10 ** 7
const DEFAULT_ALPHA = 0.9 * D
const DEFAULT_BETA = 0.2 * D
const DEFAULT_RHO = 0.002 * D
const DEFAULT_APP_MANAGER_STAKE_TOKENS = 30000
const DEFAULT_USER_STAKE_TOKENS = 15000
const MIN_THRESHOLD_STAKE_PERCENTAGE = bn((0.2 * ONE_HUNDRED_PERCENT).toString()) // 20%

const ABSTAIN_PROPOSAL_ID = new web3.utils.toBN(1)
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
  let convictionVoting, stakeTokenManager, stakeToken, requestToken, vault, agreement, collateralToken
  const requestedAmount = 1000

  before(async () => {
    agreement = await deployer.deployAndInitializeAgreementWrapper({ appManager })
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

    stakeTokenManager = await installApp(deployer.dao, deployer.acl, HookedTokenManager, [[ANY_ADDRESS, 'MINT_ROLE'], [ANY_ADDRESS, 'SET_HOOK_ROLE']], appManager)
    await stakeToken.changeController(stakeTokenManager.address)
    await stakeTokenManager.initialize(stakeToken.address, true, 0)
    await stakeTokenManager.mint(appManager, appManagerTokens)
    await stakeTokenManager.mint(user, userTokens)

    vault = await VaultMock.new({ from: appManager })
    requestToken = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'DAI', 18, 'DAI', true)
    await requestToken.generateTokens(vault.address, vaultFunds)

    convictionVoting = await installApp(deployer.dao, deployer.acl, ConvictionVoting, [[ANY_ADDRESS, 'CREATE_PROPOSALS_ROLE']], appManager)
    await convictionVoting.initialize(stakeToken.address, vault.address, requestToken.address, alpha, beta, rho, MIN_THRESHOLD_STAKE_PERCENTAGE) // alpha = 0.9, beta = 0.2, rho = 0.002
    await stakeTokenManager.registerHook(convictionVoting.address)

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

  context('_onRegisterAsHook(tokenManager, hookId, token)', () => {
    it('should revert when using token other than stake token', async () => {
      const notStakeToken = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'notStakeToken', 1, 'TKN', true)
      const stakeToken = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'stakeToken', 1, 'TKN', true)

      stakeTokenManager = await installApp(deployer.dao, deployer.acl, HookedTokenManager, [[ANY_ADDRESS, 'MINT_ROLE'], [ANY_ADDRESS, 'SET_HOOK_ROLE']], appManager)
      await notStakeToken.changeController(stakeTokenManager.address)
      await stakeTokenManager.initialize(notStakeToken.address, true, 0)

      vault = await VaultMock.new({ from: appManager })
      requestToken = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'DAI', 18, 'DAI', true)
      await requestToken.generateTokens(vault.address, 15000)
      convictionVoting = await installApp(deployer.dao, deployer.acl, ConvictionVoting, [[ANY_ADDRESS, 'CREATE_PROPOSALS_ROLE']], appManager)
      await convictionVoting.initialize(stakeToken.address, vault.address, requestToken.address, DEFAULT_ALPHA, DEFAULT_BETA, DEFAULT_RHO, MIN_THRESHOLD_STAKE_PERCENTAGE)

      await assertRevert(stakeTokenManager.registerHook(convictionVoting.address), 'CV_INCORRECT_TOKEN_MANAGER_HOOK')
    })
  })

  context('initialize(stakeToken, vault, requestToken, decay, maxRatio, weight, minThresholdStakePercentage)', () => {

    beforeEach('deploy dao and convictionVoting', async () => {
      await deploy()
    })

    it('sets fields correctly and creates abstain proposal', async () => {
      assert.isTrue(await convictionVoting.hasInitialized(), 'Not initialised')
      assert.equal(await convictionVoting.proposalCounter(), 2, 'Incorrect proposal counter')
      assert.equal(await convictionVoting.stakeToken(), stakeToken.address, 'Incorrect stake token')
      assert.equal(await convictionVoting.requestToken(), requestToken.address, 'Incorrect request token')
      assert.equal(await convictionVoting.vault(), vault.address, 'Incorrect vault token')
      assert.equal(await convictionVoting.decay(), DEFAULT_ALPHA, 'Incorrect decay')
      assert.equal(await convictionVoting.maxRatio(), DEFAULT_BETA, 'Incorrect max ratio')
      assert.equal(await convictionVoting.weight(), DEFAULT_RHO, 'Incorrect weight')
      assert.equal(await convictionVoting.minThresholdStakePercentage(), MIN_THRESHOLD_STAKE_PERCENTAGE.toString(), 'Incorrect min threshold stake percentage')
      const {
        requestedAmount,
        beneficiary,
        stakedTokens,
        convictionLast,
        blockLast,
        agreementActionId,
        proposalStatus,
        submitter
      } = await convictionVoting.getProposal(ABSTAIN_PROPOSAL_ID)
      assert.equal(requestedAmount, 0, 'Incorrect requested amount')
      assert.equal(beneficiary, 0x0, 'Incorrect beneficiary')
      assert.equal(stakedTokens, 0, 'Incorrect staked tokens')
      assert.equal(convictionLast, 0, 'Incorrect conviction last')
      assert.equal(blockLast, 0, 'Incorrect block last')
      assert.equal(agreementActionId, 0, 'Incorrect action ID')
      assert.equal(proposalStatus, PROPOSAL_STATUS.ACTIVE, 'Incorrect proposal status')
      assert.equal(submitter, 0x0, 'Incorrect submitter')
    })

    context('setConvictionCalculationSettings(decay, maxRatio, weight, minThresholdStakePercentage)', () => {

      const decay = 1 * D
      const maxRatio = 0.5 * D
      const weight = 0.005 * D
      const minThresholdStakePercentage = bn((0.3 * ONE_HUNDRED_PERCENT).toString()) // 30%

      it('sets conviction calculation settings', async () => {
        const updateSettingsRole = await convictionVoting.UPDATE_SETTINGS_ROLE()
        await deployer.acl.createPermission(appManager, convictionVoting.address, updateSettingsRole, appManager)

        await convictionVoting.setConvictionCalculationSettings(decay, maxRatio, weight, minThresholdStakePercentage)

        assert.equal(await convictionVoting.decay(), decay, 'Incorrect decay')
        assert.equal(await convictionVoting.maxRatio(), maxRatio, 'Incorrect max ratio')
        assert.equal(await convictionVoting.weight(), weight, 'Incorrect weight')
        assert.equal(await convictionVoting.minThresholdStakePercentage(), minThresholdStakePercentage.toString(), 'Incorrect min threshold stake percentage')
      })

      it('reverts when no permission', async () => {
        await assertRevert(convictionVoting.setConvictionCalculationSettings(decay, maxRatio, weight, minThresholdStakePercentage),
          'APP_AUTH_FAILED')
      })
    })

    context('addSignalingProposal(title, link)', () => {
      it('should create a signaling proposal', async () => {
        const addProposalReceipt = await convictionVoting.addSignalingProposal('Proposal 1', '0x')
        const proposalId = getEventArgument(addProposalReceipt, 'ProposalAdded', 'id')

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

        assert.equal(actualRequestedAmount, 0, 'Incorrect requested amount')
        assert.equal(actualBeneficiary, ZERO_ADDRESS, 'Incorrect beneficiary')
        assert.equal(stakedTokens, 0, 'Incorrect staked tokens')
        assert.equal(convictionLast, 0, 'Incorrect conviction last')
        assert.equal(blockLast, 0, 'Incorrect block last')
        assert.equal(agreementActionId, 1, 'Incorrect action ID')
        assert.equal(proposalStatus, PROPOSAL_STATUS.ACTIVE, 'Incorrect proposal status')
        assert.equal(submitter, appManager, 'Incorrect submitter')
        assert.equal(await convictionVoting.proposalCounter(), proposalId.toNumber() + 1, 'Incorrect proposal counter')
      })
    })

    context('addProposal(title, link, requestedAmount, beneficiary)', () => {

      let proposalId, actionId

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
        assert.equal(actualBeneficiary, beneficiary, 'Incorrect beneficiary')
        assert.equal(stakedTokens, 0, 'Incorrect staked tokens')
        assert.equal(convictionLast, 0, 'Incorrect conviction last')
        assert.equal(blockLast, 0, 'Incorrect block last')
        assert.equal(agreementActionId.toString(), actionId.toString(), 'Incorrect action ID')
        assert.equal(proposalStatus, PROPOSAL_STATUS.ACTIVE, 'Incorrect proposal status')
        assert.equal(submitter, appManager, 'Incorrect submitter')
        assert.equal(await convictionVoting.proposalCounter(), proposalId.toNumber() + 1, 'Incorrect proposal counter')
      })

      it('reverts when no beneficiary provided', async () => {
        await assertRevert(convictionVoting.addProposal('Proposal 1', '0x', requestedAmount, ZERO_ADDRESS), 'CV_NO_BENEFICIARY')
      })

      it('reverts when zero request amount specified', async () => {
        await assertRevert(convictionVoting.addProposal('Proposal 1', '0x', bn(0), beneficiary), 'CV_REQUESTED_AMOUNT_ZERO')
      })

      const assertProposalAndStakesCorrect =
        async (proposalId, convictionLast, proposalStake, blockLast, proposalAppManagerStake, totalAppManagerStake,
               appManagerStakedProposals, totalStaked) => {
          const { stakedTokens: actualProposalStake, convictionLast: actualConvictionLast, blockLast: actualBlockLast } =
            await convictionVoting.getProposal(proposalId)
          const actualProposalAppManagerStake = await convictionVoting.getProposalVoterStake(proposalId, appManager)
          const actualTotalAppManagerStake = await convictionVoting.getTotalVoterStake(appManager)
          const actualAppManagerStakedProposals = await convictionVoting.getVoterStakedProposals(appManager)
          const actualTotalStaked = await convictionVoting.totalStaked()
          assert.equal(actualConvictionLast.toNumber(), convictionLast, 'Incorrect conviction last')
          assert.equal(actualProposalStake.toNumber(), proposalStake, 'Incorrect proposal stake amount')
          assert.equal(actualBlockLast.toNumber(), blockLast, 'Incorrect block last')
          assert.equal(actualProposalAppManagerStake.toString(), proposalAppManagerStake, 'Incorrect proposal voter stake')
          assert.equal(actualTotalAppManagerStake.toString(), totalAppManagerStake, 'Incorrect total voter stake')
          assert.sameDeepMembers(actualAppManagerStakedProposals, appManagerStakedProposals, 'Incorrect voter proposals')
          assert.equal(actualTotalStaked.toString(), totalStaked, 'Incorrect total staked')
        }

      context('stakeToProposal(proposalId, amount)', () => {

        it('should stake to proposal', async () => {
          const stakeAmount = 1000
          const currentBlock = await convictionVoting.getBlockNumberPublic()

          await convictionVoting.stakeToProposal(proposalId, stakeAmount)

          await assertProposalAndStakesCorrect(
            proposalId, 0, stakeAmount, currentBlock.toNumber() + 1,
            stakeAmount, stakeAmount, [proposalId], stakeAmount)
        })

        it('should allow staking from multiple accounts', async () => {
          const stakeAmount = 1000

          await convictionVoting.stakeToProposal(proposalId, stakeAmount, { from: appManager })
          await convictionVoting.mockAdvanceBlocks(10)
          const currentBlock = await convictionVoting.getBlockNumberPublic()
          await convictionVoting.stakeToProposal(proposalId, stakeAmount, { from: user })

          await assertProposalAndStakesCorrect(
            proposalId, 6862, stakeAmount * 2,
            currentBlock.toNumber(), stakeAmount, stakeAmount, [proposalId], stakeAmount * 2)
        })

        it('should allow staking multiple times', async () => {
          const stakeAmount = 1000
          await convictionVoting.stakeToProposal(proposalId, stakeAmount)
          const currentBlock = await convictionVoting.getBlockNumberPublic()

          await convictionVoting.stakeToProposal(proposalId, stakeAmount)

          await assertProposalAndStakesCorrect(
            proposalId, 1000, stakeAmount * 2, currentBlock.toNumber() + 1,
            stakeAmount * 2, stakeAmount * 2, [proposalId], stakeAmount * 2)
        })

        it('should allow staking to multiple proposals', async () => {
          const stakeAmount = 1000
          const numberOfProposals = 4
          const currentBlock = await convictionVoting.getBlockNumberPublic()
          let proposalIds = []
          for (let i = 0; i < numberOfProposals; i++) {
            const addProposalReceipt = await convictionVoting.addProposal('Proposal 2', '0x', requestedAmount, beneficiary)
            const proposalId = getEventArgument(addProposalReceipt, 'ProposalAdded', 'id')
            await convictionVoting.stakeToProposal(proposalId, stakeAmount)
            proposalIds.push(proposalId)
          }

          await assertProposalAndStakesCorrect(
            proposalIds[0], 0, stakeAmount, currentBlock.toNumber() + 2,
            stakeAmount, stakeAmount * numberOfProposals, proposalIds, stakeAmount * numberOfProposals)
        })

        it('should reassign previously staked tokens after previous vote execution', async () => {
          await convictionVoting.stakeToProposal(proposalId, DEFAULT_APP_MANAGER_STAKE_TOKENS)
          await convictionVoting.mockAdvanceBlocks(40)
          await convictionVoting.executeProposal(proposalId)
          const addProposalReceipt = await convictionVoting.addProposal('Proposal 2', '0x', requestedAmount, beneficiary)
          const proposal2Id = getEventArgument(addProposalReceipt, 'ProposalAdded', 'id')
          const currentBlock = await convictionVoting.getBlockNumberPublic()

          await convictionVoting.stakeToProposal(proposal2Id, DEFAULT_APP_MANAGER_STAKE_TOKENS)

          await assertProposalAndStakesCorrect(
            proposal2Id, 0, DEFAULT_APP_MANAGER_STAKE_TOKENS, currentBlock,
            DEFAULT_APP_MANAGER_STAKE_TOKENS, DEFAULT_APP_MANAGER_STAKE_TOKENS, [proposal2Id], DEFAULT_APP_MANAGER_STAKE_TOKENS)
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
            await convictionVoting.executeProposal(newProposalId)
          }
        }

        it('should reassign previously staked tokens after 2 previous votes execution', async () => {
          await createAndExecuteProposals(2, DEFAULT_APP_MANAGER_STAKE_TOKENS / 2)
          const addProposalReceipt = await convictionVoting.addProposal('Proposal', '0x', requestedAmount, beneficiary)
          const proposalId = getEventArgument(addProposalReceipt, 'ProposalAdded', 'id')
          const currentBlock = await convictionVoting.getBlockNumberPublic()

          await convictionVoting.stakeToProposal(proposalId, DEFAULT_APP_MANAGER_STAKE_TOKENS)

          await assertProposalAndStakesCorrect(
            proposalId, 0, DEFAULT_APP_MANAGER_STAKE_TOKENS, currentBlock,
            DEFAULT_APP_MANAGER_STAKE_TOKENS, DEFAULT_APP_MANAGER_STAKE_TOKENS, [proposalId], DEFAULT_APP_MANAGER_STAKE_TOKENS)
        })

        it('should reassign previously staked tokens after many previous votes executions', async () => {
          await createAndExecuteProposals(8, DEFAULT_APP_MANAGER_STAKE_TOKENS / 8)
          const addProposalReceipt = await convictionVoting.addProposal('Proposal', '0x', requestedAmount, beneficiary)
          const proposalId = getEventArgument(addProposalReceipt, 'ProposalAdded', 'id')
          const currentBlock = await convictionVoting.getBlockNumberPublic()

          await convictionVoting.stakeToProposal(proposalId, DEFAULT_APP_MANAGER_STAKE_TOKENS)

          await assertProposalAndStakesCorrect(
            proposalId, 0, DEFAULT_APP_MANAGER_STAKE_TOKENS, currentBlock,
            DEFAULT_APP_MANAGER_STAKE_TOKENS, DEFAULT_APP_MANAGER_STAKE_TOKENS, [proposalId], DEFAULT_APP_MANAGER_STAKE_TOKENS)
        })

        it('should not reassign previously staked tokens before previous vote execution', async () => {
          await convictionVoting.stakeToProposal(proposalId, DEFAULT_APP_MANAGER_STAKE_TOKENS)
          await convictionVoting.mockAdvanceBlocks(40)
          const addProposalReceipt = await convictionVoting.addProposal('Proposal 2', '0x', requestedAmount, beneficiary)
          const proposal2Id = getEventArgument(addProposalReceipt, 'ProposalAdded', 'id')

          await assertRevert(convictionVoting.stakeToProposal(proposal2Id, DEFAULT_APP_MANAGER_STAKE_TOKENS), 'CV_STAKING_MORE_THAN_AVAILABLE')
        })

        it('should not stake to more than max proposals', async () => {
          const maxStakedProposals = await convictionVoting.MAX_STAKED_PROPOSALS()
          for (let i = 0; i < maxStakedProposals; i++) {
            const addProposalReceipt = await convictionVoting.addProposal('Proposal 2', '0x', requestedAmount, beneficiary)
            const proposalId = getEventArgument(addProposalReceipt, 'ProposalAdded', 'id')
            await convictionVoting.stakeToProposal(proposalId, 100)
          }

          await assertRevert(convictionVoting.stakeToProposal(proposalId, 100), 'CV_MAX_PROPOSALS_REACHED')
        })

        it('should revert when proposal does not exist', async () => {
          const nonExistentProposalId = 99
          await assertRevert(convictionVoting.stakeToProposal(nonExistentProposalId, 100), 'CV_PROPOSAL_DOES_NOT_EXIST')
        })

        it('should revert when stake amount is 0', async () => {
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
          await convictionVoting.cancelProposal(proposalId)

          await assertRevert(convictionVoting.stakeToProposal(proposalId, 1000), 'CV_PROPOSAL_NOT_ACTIVE')
        })

        it('should revert when cancelled by Agreements', async () => {
          await agreement.challenge({ actionId })
          await agreement.dispute({ actionId })
          await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })

          await assertRevert(convictionVoting.stakeToProposal(proposalId, 1000), 'CV_PROPOSAL_NOT_ACTIVE')
        })

        it('should revert when executed', async () => {
          await convictionVoting.stakeToProposal(proposalId, 6000)
          await convictionVoting.mockAdvanceBlocks(80)
          await convictionVoting.executeProposal(proposalId)

          await assertRevert(convictionVoting.stakeToProposal(proposalId, 1000), 'CV_PROPOSAL_NOT_ACTIVE')
        })

        context('withdrawFromProposal(proposalId, amount)', () => {

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
              stakeAmount - withdrawAmount, stakeAmount - withdrawAmount, [proposalId], stakeAmount - withdrawAmount)
          })

          it('does not update block last or conviction last when executed', async () => {
            await convictionVoting.stakeToProposal(proposalId, 4000)
            await convictionVoting.stakeToProposal(proposalId, 2000, { from: user })
            await convictionVoting.mockAdvanceBlocks(80)
            await convictionVoting.executeProposal(proposalId)
            const { convictionLast: convictionBefore, blockLast: blockLastBefore } = await convictionVoting.getProposal(proposalId)

            await convictionVoting.withdrawFromProposal(proposalId, 1000, { from: user })

            const { convictionLast: convictionAfter, blockLast: blockLastAfter } = await convictionVoting.getProposal(proposalId)
            assert.equal(blockLastAfter.toString(), blockLastBefore.toString(), 'Incorrect block last')
            assert.equal(convictionAfter.toString(), convictionBefore.toString(), 'Incorrect conviction')
          })

          it('reverts when proposal does not exist', async () => {
            const nonExistentProposalId = 99
            await assertRevert(convictionVoting.withdrawFromProposal(nonExistentProposalId, stakeAmount), 'CV_PROPOSAL_DOES_NOT_EXIST')
          })

          it('reverts when withdrawing more than staked', async () => {
            await assertRevert(convictionVoting.withdrawFromProposal(proposalId, stakeAmount + 1), 'CV_WITHDRAW_MORE_THAN_STAKED')
          })

          it('reverts when withdrawing 0', async () => {
            await assertRevert(convictionVoting.withdrawFromProposal(proposalId, 0), 'CV_AMOUNT_CAN_NOT_BE_ZERO')
          })
        })

        context('withdrawAllFromProposal(proposalId)', () => {
          it('withdraws all from proposal', async () => {
            const stakeAmount = 1000
            await convictionVoting.stakeToProposal(proposalId, stakeAmount)
            const { stakedTokens: stakedBefore } = await convictionVoting.getProposal(proposalId)
            const currentBlock = await convictionVoting.getBlockNumberPublic()

            await convictionVoting.withdrawAllFromProposal(proposalId)

            await assertProposalAndStakesCorrect(
              proposalId, 1000, stakedBefore.toNumber() - stakeAmount,
              currentBlock.toNumber() + 1, 0, 0, [], 0)
          })

          it('reverts when proposal does not exist', async () => {
            const nonExistentProposalId = 99
            await assertRevert(convictionVoting.withdrawAllFromProposal(nonExistentProposalId), 'CV_PROPOSAL_DOES_NOT_EXIST')
          })
        })

        context('onTransfer(from, to, amount)', () => {
          it('unstakes staked tokens when transferring more than currently unstaked', async () => {
            const transferAmount = 5000
            await convictionVoting.stakeToProposal(proposalId, DEFAULT_APP_MANAGER_STAKE_TOKENS)
            const currentBlock = await convictionVoting.getBlockNumberPublic()

            await stakeToken.transfer(user, transferAmount)

            const stakedMinusTransferred = DEFAULT_APP_MANAGER_STAKE_TOKENS - transferAmount
            await assertProposalAndStakesCorrect(
              proposalId, DEFAULT_APP_MANAGER_STAKE_TOKENS, stakedMinusTransferred,
              currentBlock.toNumber() + 1, stakedMinusTransferred,
              stakedMinusTransferred, [proposalId], stakedMinusTransferred)
          })

          it('unstakes staked tokens when transferring more than currently unstaked from abstain proposal', async () => {
            const transferAmount = 5000
            await convictionVoting.stakeToProposal(ABSTAIN_PROPOSAL_ID, DEFAULT_APP_MANAGER_STAKE_TOKENS)
            const currentBlock = await convictionVoting.getBlockNumberPublic()

            await stakeToken.transfer(user, transferAmount)
            const stakedMinusTransferred = DEFAULT_APP_MANAGER_STAKE_TOKENS - transferAmount
            await assertProposalAndStakesCorrect(
              ABSTAIN_PROPOSAL_ID, DEFAULT_APP_MANAGER_STAKE_TOKENS, stakedMinusTransferred,
              currentBlock.toNumber() + 1, stakedMinusTransferred,
              stakedMinusTransferred, [ABSTAIN_PROPOSAL_ID], stakedMinusTransferred)
          })

          it('unstakes staked tokens when transferring more than currently unstaked from abstain proposal then open proposal', async () => {
            const transferAmount = (DEFAULT_APP_MANAGER_STAKE_TOKENS / 2) + 3000
            const stakeAmount = DEFAULT_APP_MANAGER_STAKE_TOKENS / 2
            await convictionVoting.stakeToProposal(ABSTAIN_PROPOSAL_ID, stakeAmount)
            const newProposalIds = await createAndStakeToProposals(1, stakeAmount)
            const currentBlock = await convictionVoting.getBlockNumberPublic()

            await stakeToken.transfer(user, transferAmount)

            const stakedMinusTransferred = DEFAULT_APP_MANAGER_STAKE_TOKENS - transferAmount
            await assertProposalAndStakesCorrect(
              ABSTAIN_PROPOSAL_ID, 40650, 0,
              currentBlock.toNumber() + 1, 0,
              stakedMinusTransferred, newProposalIds, stakedMinusTransferred)
            const actualProposalAppManagerStake = await convictionVoting.getProposalVoterStake(newProposalIds[0], appManager)
            assert.equal(actualProposalAppManagerStake.toString(), stakeAmount - 3000, 'Incorrect proposal voter stake')
          })

          const createAndStakeToProposals = async (numberOfProposals, stakeForProposals) => {
            let newProposalIds = []
            for (let i = 0; i < numberOfProposals; i++) {
              const addNewProposalReceipt = await convictionVoting.addProposal('Proposal', '0x', 100, beneficiary)
              const newProposalId = getEventArgument(addNewProposalReceipt, 'ProposalAdded', 'id')
              await convictionVoting.stakeToProposal(newProposalId, stakeForProposals)
              newProposalIds.push(newProposalId)
            }
            return newProposalIds
          }

          it('unstakes staked tokens when transferring more than currently unstaked from 2 open proposals', async () => {
            const numberOfProposals = 2
            const stakeAmount = DEFAULT_APP_MANAGER_STAKE_TOKENS / numberOfProposals
            const transferAmount = stakeAmount + 1000
            const totalAppManagerStake = DEFAULT_APP_MANAGER_STAKE_TOKENS - transferAmount
            const newProposalIds = await createAndStakeToProposals(numberOfProposals, stakeAmount)
            const currentBlock = await convictionVoting.getBlockNumberPublic()

            await stakeToken.transfer(user, transferAmount)

            await assertProposalAndStakesCorrect(
              newProposalIds[0], 40650, 0, currentBlock.toNumber() + 1,
              0, totalAppManagerStake, [newProposalIds[1]], DEFAULT_APP_MANAGER_STAKE_TOKENS - transferAmount)
            const actualProposalAppManagerStake = await convictionVoting.getProposalVoterStake(newProposalIds[1], appManager)
            assert.equal(actualProposalAppManagerStake.toString(), DEFAULT_APP_MANAGER_STAKE_TOKENS / numberOfProposals - 1000, 'Incorrect proposal voter stake')
          })

          it('unstakes staked tokens when transferring more than currently unstaked from many open proposals', async () => {
            const numberOfProposals = 4
            const transferAmount = DEFAULT_APP_MANAGER_STAKE_TOKENS / 2 + 1000
            const totalAppManagerStake = DEFAULT_APP_MANAGER_STAKE_TOKENS - transferAmount
            const newProposalIds = await createAndStakeToProposals(numberOfProposals, DEFAULT_APP_MANAGER_STAKE_TOKENS / numberOfProposals)
            const currentBlock = await convictionVoting.getBlockNumberPublic()

            await stakeToken.transfer(user, transferAmount)

            await assertProposalAndStakesCorrect(
              newProposalIds[0], 39128, 0, currentBlock.toNumber() + 1,
              0, totalAppManagerStake, [newProposalIds[2], newProposalIds[3]], totalAppManagerStake)
            const proposal1AppManagerStake = await convictionVoting.getProposalVoterStake(newProposalIds[1], appManager)
            assert.equal(proposal1AppManagerStake.toString(), 0, 'Incorrect proposal 1 voter stake')
            const proposal2AppManagerStake = await convictionVoting.getProposalVoterStake(newProposalIds[2], appManager)
            assert.equal(proposal2AppManagerStake.toString(), DEFAULT_APP_MANAGER_STAKE_TOKENS / numberOfProposals - 1000, 'Incorrect proposal 2 voter stake')
            const proposal3AppManagerStake = await convictionVoting.getProposalVoterStake(newProposalIds[3], appManager)
            assert.equal(proposal3AppManagerStake.toString(), DEFAULT_APP_MANAGER_STAKE_TOKENS / numberOfProposals, 'Incorrect proposal 3 voter stake')
          })

          it('unstakes staked tokens when transferring more than currently unstaked from many open and closed proposals', async () => {
            const numberOfProposals = 4
            const transferAmount = (DEFAULT_APP_MANAGER_STAKE_TOKENS / 2) + 1000
            const totalAppManagerStake = DEFAULT_APP_MANAGER_STAKE_TOKENS - transferAmount
            const newProposalIds = await createAndStakeToProposals(numberOfProposals, DEFAULT_APP_MANAGER_STAKE_TOKENS / numberOfProposals)
            await convictionVoting.mockAdvanceBlocks(40)
            await convictionVoting.executeProposal(newProposalIds[3])
            const currentBlock = await convictionVoting.getBlockNumberPublic()

            await stakeToken.transfer(user, transferAmount)

            await assertProposalAndStakesCorrect(
              newProposalIds[0], 74470, 0, currentBlock.toNumber(),
              0, totalAppManagerStake, [newProposalIds[1], newProposalIds[2]], totalAppManagerStake)
            const proposal1AppManagerStake = await convictionVoting.getProposalVoterStake(newProposalIds[1], appManager)
            assert.equal(proposal1AppManagerStake.toString(), DEFAULT_APP_MANAGER_STAKE_TOKENS / numberOfProposals - 1000, 'Incorrect proposal 1 voter stake')
            const proposal2AppManagerStake = await convictionVoting.getProposalVoterStake(newProposalIds[2], appManager)
            assert.equal(proposal2AppManagerStake.toString(), DEFAULT_APP_MANAGER_STAKE_TOKENS / numberOfProposals, 'Incorrect proposal 2 voter stake')
            const proposal3AppManagerStake = await convictionVoting.getProposalVoterStake(newProposalIds[3], appManager)
            assert.equal(proposal3AppManagerStake.toString(), 0, 'Incorrect proposal 3 voter stake')
          })

          it('does not unstake tokens when transferring less than currently unstaked', async () => {
            const transferAmount = 5000
            const stakedTokens = DEFAULT_APP_MANAGER_STAKE_TOKENS - transferAmount
            await convictionVoting.stakeToProposal(proposalId, stakedTokens)
            const currentBlock = await convictionVoting.getBlockNumberPublic()

            await stakeToken.transfer(user, transferAmount)

            await assertProposalAndStakesCorrect(
              proposalId, 0, stakedTokens, currentBlock.toNumber(),
              stakedTokens, stakedTokens, [proposalId], stakedTokens)
          })

          it('allows minting new tokens', async () => {
            const stakeAmount = 200
            await stakeTokenManager.mint(user, stakeAmount)
            assert.equal(await stakeToken.balanceOf(user), DEFAULT_USER_STAKE_TOKENS + stakeAmount)
          })
        })

        context('executeProposal(proposalId)', () => {
          it('transfers funds and finalises when enough conviction', async () => {
            const vaultBalanceBefore = await requestToken.balanceOf(vault.address)
            const beneficiaryBalanceBefore = await requestToken.balanceOf(beneficiary)
            const stakeAmount = 10000
            await convictionVoting.stakeToProposal(proposalId, stakeAmount)
            await convictionVoting.mockAdvanceBlocks(40)
            await convictionVoting.executeProposal(proposalId)

            const { proposalStatus } = await convictionVoting.getProposal(proposalId)
            assert.equal(proposalStatus, PROPOSAL_STATUS.EXECUTED, 'Incorrect proposal status')
            const vaultBalanceAfter = await requestToken.balanceOf(vault.address)
            assert.equal(vaultBalanceAfter, vaultBalanceBefore - requestedAmount, 'Incorrect vault balance')
            const beneficiaryBalanceAfter = await requestToken.balanceOf(beneficiary)
            assert.equal(beneficiaryBalanceAfter.toNumber(), beneficiaryBalanceBefore.toNumber() + requestedAmount, 'Incorrect beneficiary balance')
            const { closed } = await agreement.getAction(actionId)
            assert.isTrue(closed, 'Incorrect closed status')
          })

          it('should revert when executing non existing proposal', async () => {
            const nonExistentProposalId = 99
            await assertRevert(convictionVoting.executeProposal(nonExistentProposalId), 'CV_PROPOSAL_DOES_NOT_EXIST')
          })

          it('should revert when executing abstain proposal', async () => {
            await assertRevert(convictionVoting.executeProposal(ABSTAIN_PROPOSAL_ID), 'CV_CANNOT_EXECUTE_ABSTAIN_PROPOSAL')
          })

          it('should revert when too little conviction', async () => {
            const propoasalStake = 1000
            const addProposalReceipt = await convictionVoting.addProposal('Proposal 1', '0x', requestedAmount, beneficiary)
            const newProposalId = getEventArgument(addProposalReceipt, 'ProposalAdded', 'id')
            await convictionVoting.stakeToProposal(newProposalId, DEFAULT_USER_STAKE_TOKENS, { from: user })
            await convictionVoting.stakeToProposal(proposalId, propoasalStake)
            await convictionVoting.mockAdvanceBlocks(50)

            await assertRevert(convictionVoting.executeProposal(proposalId), 'CV_INSUFFICIENT_CONVICION')
          })

          it('should revert when too little conviction and threshold minimum stake used', async () => {
            const propoasalStake = 1000
            const addProposalReceipt = await convictionVoting.addProposal('Proposal 1', '0x', requestedAmount, beneficiary)
            const newProposalId = getEventArgument(addProposalReceipt, 'ProposalAdded', 'id')
            await convictionVoting.stakeToProposal(proposalId, propoasalStake)
            await convictionVoting.mockAdvanceBlocks(20)

            await assertRevert(convictionVoting.executeProposal(proposalId), 'CV_INSUFFICIENT_CONVICION')
          })

          // const advanceBlocksAndPrintConviction = async (blocks, numberOfTimes) => {
          //   console.log("Conviction required ", (await convictionVoting.calculateThreshold(requestedAmount)).toString())
          //   for (let i = 0; i < numberOfTimes; i++) {
          //     await convictionVoting.mockAdvanceBlocks(blocks)
          //     await convictionVoting.stakeToProposal(proposalId, 1)
          //     console.log("Conviction last ", ((await convictionVoting.getProposal(proposalId)).convictionLast).toString())
          //   }
          // }

          it('should revert when challenged', async () => {
            await convictionVoting.stakeToProposal(proposalId, 10000)
            await convictionVoting.mockAdvanceBlocks(40)
            await agreement.challenge({ actionId })

            await assertRevert(convictionVoting.executeProposal(proposalId), 'CV_PROPOSAL_NOT_ACTIVE')
          })

          it('should revert when cancelled', async () => {
            await convictionVoting.stakeToProposal(proposalId, 10000)
            await convictionVoting.mockAdvanceBlocks(40)
            await convictionVoting.cancelProposal(proposalId)

            await assertRevert(convictionVoting.executeProposal(proposalId), 'CV_PROPOSAL_NOT_ACTIVE')
          })

          it('should revert when cancelled by Agreements', async () => {
            await convictionVoting.stakeToProposal(proposalId, 10000)
            await convictionVoting.mockAdvanceBlocks(40)
            await agreement.challenge({ actionId })
            await agreement.dispute({ actionId })
            await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })

            await assertRevert(convictionVoting.executeProposal(proposalId), 'CV_PROPOSAL_NOT_ACTIVE')
          })

          it('should revert when already executed', async () => {
            await convictionVoting.stakeToProposal(proposalId, 10000)
            await convictionVoting.mockAdvanceBlocks(40)
            await convictionVoting.executeProposal(proposalId)

            await assertRevert(convictionVoting.executeProposal(proposalId), 'CV_PROPOSAL_NOT_ACTIVE')
          })
        })
      })

      context('stakeAllToProposal(proposalId)', () => {
        it('should stake entire balance to proposal', async () => {
          const stakeAmount = await stakeToken.balanceOf(appManager)
          const currentBlock = await convictionVoting.getBlockNumberPublic()

          await convictionVoting.stakeAllToProposal(proposalId)

          await assertProposalAndStakesCorrect(
            proposalId, 0, stakeAmount, currentBlock.toNumber() + 1,
            stakeAmount, stakeAmount, [proposalId], stakeAmount)
        })

        it('should revert when proposal does not exist', async () => {
          const nonExistentProposalId = 99
          await assertRevert(convictionVoting.stakeAllToProposal(nonExistentProposalId), 'CV_PROPOSAL_DOES_NOT_EXIST')
        })

        it('should revert when already staked', async () => {
          await convictionVoting.stakeToProposal(proposalId, 1000)
          await assertRevert(convictionVoting.stakeAllToProposal(proposalId), 'CV_STAKING_ALREADY_STAKED')
        })
      })

      context('cancelProposal(proposalId)', () => {
        it('cancels proposal when sender is the proposal submitter', async () => {
          await convictionVoting.cancelProposal(proposalId)

          const { proposalStatus } = await convictionVoting.getProposal(proposalId)
          assert.equal(proposalStatus, PROPOSAL_STATUS.CANCELLED, 'Incorrect proposal status')
          const { closed } = await agreement.getAction(actionId)
          assert.isTrue(closed, 'Incorrect closed status')
        })

        it('cancels proposal when sender has permission', async () => {
          const cancelProposalRole = await convictionVoting.CANCEL_PROPOSAL_ROLE()
          await deployer.acl.createPermission(user, convictionVoting.address, cancelProposalRole, appManager)

          await convictionVoting.cancelProposal(proposalId, { from: user })

          const { proposalStatus } = await convictionVoting.getProposal(proposalId)
          assert.equal(proposalStatus, PROPOSAL_STATUS.CANCELLED, 'Incorrect proposal status')
          const { closed } = await agreement.getAction(actionId)
          assert.isTrue(closed, 'Incorrect closed status')
        })

        it('should revert when proposal does not exist', async () => {
          const nonExistentProposalId = 99
          await assertRevert(convictionVoting.cancelProposal(nonExistentProposalId, { from: user }), 'CV_PROPOSAL_DOES_NOT_EXIST')
        })

        it('should revert when sender does not have permission and is not the proposal submitter', async () => {
          const cancelProposalRole = await convictionVoting.CANCEL_PROPOSAL_ROLE()
          await assertRevert(convictionVoting.cancelProposal(proposalId, { from: user }), 'CV_SENDER_CANNOT_CANCEL')
        })

        it('should revert when cancelling abstain proposal', async () => {
          const cancelProposalRole = await convictionVoting.CANCEL_PROPOSAL_ROLE()
          await deployer.acl.createPermission(user, convictionVoting.address, cancelProposalRole, appManager)
          await assertRevert(convictionVoting.cancelProposal(ABSTAIN_PROPOSAL_ID, { from: user }), 'CV_CANNOT_CANCEL_ABSTAIN_PROPOSAL')
        })

        it('should revert when challenged', async () => {
          await agreement.challenge({ actionId })

          await assertRevert(convictionVoting.cancelProposal(proposalId), 'CV_PROPOSAL_NOT_ACTIVE')
        })

        it('should revert when cancelled', async () => {
          await convictionVoting.cancelProposal(proposalId)

          await assertRevert(convictionVoting.cancelProposal(proposalId), 'CV_PROPOSAL_NOT_ACTIVE')
        })

        it('should revert when cancelled by Agreements', async () => {
          await agreement.challenge({ actionId })
          await agreement.dispute({ actionId })
          await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })

          await assertRevert(convictionVoting.cancelProposal(proposalId), 'CV_PROPOSAL_NOT_ACTIVE')
        })

        it('should revert when executed', async () => {
          await convictionVoting.stakeToProposal(proposalId, 10000)
          await convictionVoting.mockAdvanceBlocks(40)
          await convictionVoting.executeProposal(proposalId)

          await assertRevert(convictionVoting.cancelProposal(proposalId), 'CV_PROPOSAL_NOT_ACTIVE')
        })
      })
    })
  })

  context('Pure functions', () => {
    context('Alpha = 0.9', () => {

      beforeEach('deploy DAO and convictionVoting', async () => {
        await deploy()
        const addProposalReceipt = await convictionVoting.addProposal('Proposal 1', '0x', requestedAmount, beneficiary)
        const proposalId = getEventArgument(addProposalReceipt, 'ProposalAdded', 'id')
        await convictionVoting.stakeToProposal(proposalId, DEFAULT_APP_MANAGER_STAKE_TOKENS, { from: appManager })
        await convictionVoting.stakeToProposal(proposalId, DEFAULT_USER_STAKE_TOKENS, { from: user })
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
          const appManagerTokens = bn('1000000000000000000000')
          const userTokens = bn('164000000000000000000')
          await deploy(
            18,
            [appManagerTokens, userTokens],
            bn('745000000000000000000'),
            0.9999599 * D,
            0.2 * D,
            0.002 * D
          )
          const addProposalReceipt = await convictionVoting.addProposal('Proposal 1', '0x', requestedAmount, beneficiary)
          const proposalId = getEventArgument(addProposalReceipt, 'ProposalAdded', 'id')
          await convictionVoting.stakeToProposal(proposalId, appManagerTokens, { from: appManager })
          await convictionVoting.stakeToProposal(proposalId, userTokens, { from: user })
        }
      )

      it('conviction function', async () => {
        assert.equal((await convictionVoting.calculateConviction(17280, 0, 15000)).toNumber(), Math.round(calculateConviction(17280, 0, 15000, 0.9999599)))
      })

      it('threshold function', async () => {
        assert.equal(
          parseInt(await convictionVoting.calculateThreshold(bn('1000000000000000000')))
            .toPrecision(10), calculateThreshold(1, 745, 1164000000000000000000, 0.9999599, 0.2, 0.002)
            .toPrecision(10))
      })
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
      it('returns true when vote not challenged/paused', async () => {
        const canChallenge = await convictionVoting.canChallenge(proposalId)

        assert.isTrue(canChallenge)
      })

      it('returns true when vote challenged/paused and allowed (ensures we can challenge multiple times)', async () => {
        await agreement.challenge({ actionId })
        await agreement.dispute({ actionId })
        await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })

        const canChallenge = await convictionVoting.canChallenge(proposalId)

        assert.isTrue(canChallenge)
      })

      it('returns false when vote has been challenged/paused', async () => {
        await agreement.challenge({ actionId })

        const canChallenge = await convictionVoting.canChallenge(proposalId)

        assert.isFalse(canChallenge)
      })

      it('returns false when vote has been cancelled', async () => {
        await convictionVoting.cancelProposal(proposalId)

        const canChallenge = await convictionVoting.canChallenge(proposalId)
        assert.isFalse(canChallenge)
      })

      it('returns true when vote has reached threshold but not been executed', async () => {
        await convictionVoting.stakeToProposal(proposalId, 15000, { from: appManager })
        await convictionVoting.mockAdvanceBlocks(10)

        const canChallenge = await convictionVoting.canChallenge(proposalId)

        assert.isTrue(canChallenge)
      })

      it('returns false when vote has been executed', async () => {
        await convictionVoting.stakeToProposal(proposalId, 15000, { from: appManager })
        await convictionVoting.mockAdvanceBlocks(10)
        await convictionVoting.executeProposal(proposalId, { from: user })

        const canChallenge = await convictionVoting.canChallenge(proposalId)

        assert.isFalse(canChallenge)
      })
    })

    describe('canClose(uint256 _proposalId)', () => {
      it('returns false when vote not executed or cancelled', async () => {
        const canClose = await convictionVoting.canClose(proposalId)

        assert.isFalse(canClose)
      })

      it('returns false when vote has been challenged/paused', async () => {
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
        await convictionVoting.mockAdvanceBlocks(10)
        await convictionVoting.executeProposal(proposalId, { from: user })

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

      it('allows execution', async () => {
        await convictionVoting.stakeToProposal(proposalId, 10000)
        await convictionVoting.mockAdvanceBlocks(40)
        await agreement.challenge({ actionId })
        await agreement.dispute({ actionId })
        await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })

        await convictionVoting.executeProposal(proposalId)

        const { proposalStatus } = await convictionVoting.getProposal(proposalId)
        assert.equal(proposalStatus, PROPOSAL_STATUS.EXECUTED, 'Incorrect proposal status')
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
