/* eslint-disable @typescript-eslint/no-use-before-define */
import { Address, BigInt, log } from '@graphprotocol/graph-ts'
import {
  ProposalAdded as ProposalAddedEvent,
  StakeAdded as StakeAddedEvent,
  StakeWithdrawn as StakeWithdrawnEvent,
  ProposalCancelled as ProposalCancelledEvent,
  ProposalExecuted as ProposalExecutedEvent,
  ProposalPaused as ProposalPausedEvent,
  ProposalResumed as ProposalResumedEvent,
  ProposalRejected as ProposalRejectedEvent
} from '../generated/templates/ConvictionVoting/ConvictionVoting'
import { ConvictionVoting as ConvictionVotingContract } from '../generated/templates/ConvictionVoting/ConvictionVoting'
import { Agreement as AgreementContract } from '../generated/templates/Agreement/Agreement'
import { CollateralRequirement as CollateralRequirementEntity, Proposal as ProposalEntity } from '../generated/schema'
import {
  getConfigEntity,
  getProposalEntity,
  getStakeEntity,
  getStakeHistoryEntity,
  loadTokenData
} from './helpers'
import { STATUS_ACTIVE, STATUS_CANCELLED, STATUS_CHALLENGED, STATUS_EXECUTED, STATUS_REJECTED } from './proposal-statuses'


export function handleProposalAdded(event: ProposalAddedEvent): void {
  const ABSTAIN_PROPOSAL_ID = BigInt.fromI32(1)

  const convictionVotingApp = ConvictionVotingContract.bind(event.address)
  const proposal = getProposalEntity(event.address, event.params.id)

  proposal.name = event.params.title
  proposal.link = event.params.link.toString()
  proposal.requestedAmount = event.params.amount
  proposal.creator = event.params.entity
  proposal.beneficiary = event.params.beneficiary
  proposal.convictionVoting = event.address.toHexString()
  proposal.actionId = event.params.actionId
  
  proposal.save()
  log.info('******* ID is : {}', [event.params.id.toString()])

  if(event.params.id != ABSTAIN_PROPOSAL_ID){
    const agreementAppAddress = convictionVotingApp.getAgreement()
    const agreementApp = AgreementContract.bind(agreementAppAddress)
    const actionData = agreementApp.getAction(proposal.actionId)
    const collateralRequirementData = agreementApp.getCollateralRequirement(event.address, actionData.value2)
    const collateralRequirement = new CollateralRequirementEntity(proposal.id)
    collateralRequirement.proposal = proposal.id
    collateralRequirement.token = loadTokenData(collateralRequirementData.value0)
    collateralRequirement.challengeDuration = collateralRequirementData.value1
    collateralRequirement.actionAmount = collateralRequirementData.value2
    collateralRequirement.challengeAmount = collateralRequirementData.value3
    collateralRequirement.save()
  }
  
}

export function handleStakeAdded(event: StakeAddedEvent): void {
  _onNewStake(
    event.address,
    event.params.entity,
    event.params.id,
    event.params.amount,
    event.params.tokensStaked,
    event.params.totalTokensStaked,
    event.params.conviction,
    event.block.number
  )
}

export function handleStakeWithdrawn(event: StakeWithdrawnEvent): void {
  _onNewStake(
    event.address,
    event.params.entity,
    event.params.id,
    event.params.amount,
    event.params.tokensStaked,
    event.params.totalTokensStaked,
    event.params.conviction,
    event.block.number
  )
}


export function handleProposalExecuted(event: ProposalExecutedEvent): void {
  const proposal = getProposalEntity(event.address, event.params.id)
  proposal.status = STATUS_EXECUTED
  
  proposal.save()
}

export function handleProposalCancelled(event: ProposalCancelledEvent): void {
  const proposal = getProposalEntity(event.address, event.params.proposalId)
  proposal.status = STATUS_CANCELLED

  proposal.save()
}

export function handleProposalPaused(event: ProposalPausedEvent): void {
  const convictionVotingApp = ConvictionVotingContract.bind(event.address)
  const agreementApp = AgreementContract.bind(convictionVotingApp.getAgreement())
  const challengeData = agreementApp.getChallenge(event.params.challengeId)
  const proposal = getProposalEntity(event.address, event.params.proposalId)
  proposal.challenger = challengeData.value1
  proposal.challengeId = event.params.challengeId
  proposal.challengeEndDate = challengeData.value2
  proposal.status = STATUS_CHALLENGED

  proposal.save()
}

export function handleProposalResumed(event: ProposalResumedEvent): void {
  const proposal = getProposalEntity(event.address, event.params.proposalId)
  proposal.status = STATUS_ACTIVE

  proposal.save()
}

export function handleProposalRejected(event: ProposalRejectedEvent): void {
  const proposal = getProposalEntity(event.address, event.params.proposalId)
  proposal.status = STATUS_REJECTED

  proposal.save()
}


function _onNewStake(
  appAddress: Address,
  entity: Address,
  proposalId: BigInt,
  amount: BigInt,
  tokensStaked: BigInt,
  totalTokensStaked: BigInt,
  conviction: BigInt,
  blockNumber: BigInt
): void {
  const proposal = getProposalEntity(appAddress, proposalId)

  // Hotfix: Orgs managed to stake to non existing proposals 
  if (proposal.creator.toHexString() == '0x') {
    return 
  }

  const config = getConfigEntity(appAddress)

  // If the old totalTokensStaked is less than the new means that is a stake else a withdraw
  if (proposal.totalTokensStaked < totalTokensStaked){
    config.totalStaked = config.totalStaked.plus(amount)
  } else {
    config.totalStaked = config.totalStaked.minus(amount)
  }
  config.save()

  proposal.totalTokensStaked = totalTokensStaked

  _updateProposalStakes(proposal, entity, tokensStaked)
  _updateStakeHistory(
    proposal,
    appAddress,
    entity,
    tokensStaked,
    totalTokensStaked,
    conviction,
    blockNumber
  )
}


function _updateProposalStakes(
  proposal: ProposalEntity | null,
  entity: Address,
  tokensStaked: BigInt
): void {
  const stake = getStakeEntity(proposal, entity)
  stake.amount = tokensStaked

  const stakes = proposal.stakes
  stakes.push(stake.id)
  proposal.stakes = stakes

  stake.save()
  proposal.save()
}

function _updateStakeHistory(
  proposal: ProposalEntity | null,
  appAddress: Address,
  entity: Address,
  tokensStaked: BigInt,
  totalTokensStaked: BigInt,
  conviction: BigInt,
  blockNumber: BigInt
): void {
  const stakeHistory = getStakeHistoryEntity(proposal, entity, blockNumber)

  stakeHistory.tokensStaked = tokensStaked
  stakeHistory.totalTokensStaked = totalTokensStaked
  stakeHistory.conviction = conviction
  stakeHistory.convictionVoting = appAddress.toHexString()

  stakeHistory.save()
}
