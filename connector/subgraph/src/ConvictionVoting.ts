/* eslint-disable @typescript-eslint/no-use-before-define */
import { Address, BigInt } from '@graphprotocol/graph-ts'
import {
  ConvictionSettingsChanged as ConvictionSettingsChangedEvent,
  ProposalAdded as ProposalAddedEvent,
  StakeAdded as StakeAddedEvent,
  StakeWithdrawn as StakeWithdrawnEvent,
  ProposalCancelled as ProposalCancelledEvent,
  ProposalExecuted as ProposalExecutedEvent,
} from '../generated/templates/ConvictionVoting/ConvictionVoting'
import { Proposal as ProposalEntity } from '../generated/schema'
import {
  getConfigEntity,
  getProposalEntity,
  getStakeEntity,
  getStakeHistoryEntity,
  getOrgAddress,
} from './helpers'
import { STATUS_CANCELLED, STATUS_EXECUTED } from './proposal-statuses'

export function handleConfigChange(event: ConvictionSettingsChangedEvent): void {
  let config = getConfigEntity(event.address)
  config.decay = event.params.decay
  config.maxRatio = event.params.maxRatio
  config.weight = event.params.weight
  config.minThresholdStakePercentage = event.params.minThresholdStakePercentage

  config.save()
}

export function handleProposalAdded(event: ProposalAddedEvent): void {
  const proposal = getProposalEntity(event.address, event.params.id)

  proposal.appAddress = event.address
  proposal.orgAddress = getOrgAddress(event.address)

  _populateProposalDataFromEvent(proposal, event)

  proposal.save()
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
  const proposal = getProposalEntity(event.address, event.params.id)
  proposal.status = STATUS_CANCELLED

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

function _populateProposalDataFromEvent(
  proposal: ProposalEntity | null,
  event: ProposalAddedEvent
): void {
  proposal.name = event.params.title
  proposal.link = event.params.link.toString()
  proposal.requestedAmount = event.params.amount
  proposal.creator = event.params.entity
  proposal.beneficiary = event.params.beneficiary
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
  stakeHistory.appAddress = appAddress
  stakeHistory.orgAddress = getOrgAddress(appAddress)

  stakeHistory.save()
}
