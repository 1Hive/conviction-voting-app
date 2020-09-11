import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import {
  Config as ConfigEntity,
  DisputableConvictionVoting as DisputableConvictionVotingEntity,
  Proposal as ProposalEntity,
  Stake as StakeEntity,
  StakeHistory as StakeHistoryEntity,
  Token as TokenEntity,
} from '../generated/schema'
import { MiniMeToken as MiniMeTokenContract } from '../generated/templates/ConvictionVoting/MiniMeToken'
import { ConvictionVoting as ConvictionVotingContract } from '../generated/templates/ConvictionVoting/ConvictionVoting'
import { STATUS_ACTIVE } from './proposal-statuses'

export function loadTokenData(address: Address): string | null {
  const id = address.toHexString()
  let token = TokenEntity.load(id)

  if (token === null) {
    const tokenContract = MiniMeTokenContract.bind(address)
    token = new TokenEntity(id)
    // App could be instantiated without a vault which means request token could be invalid
    const symbol = tokenContract.try_symbol()
    if (symbol.reverted) {
      return null
    }
    token.name = tokenContract.name()
    token.symbol = tokenContract.symbol()
    token.decimals = tokenContract.decimals()
    token.save()
  }

  return token.id
}

function getConfigEntityId(appAddress: Address): string {
  return appAddress.toHexString()
}

export function getConfigEntity(appAddress: Address): ConfigEntity | null {
  const configEntityId = getConfigEntityId(appAddress)

  let config = ConfigEntity.load(configEntityId)

  if (!config) {
    config = new ConfigEntity(configEntityId)
  }

  return config
}

export function loadAppConfig(appAddress: Address): void {
  const config = getConfigEntity(appAddress)
  const convictionVoting = ConvictionVotingContract.bind(appAddress)

  // Load tokens data
  const stakeToken = convictionVoting.stakeToken()
  const stakeTokenId = loadTokenData(stakeToken)
  if(stakeTokenId){
    config.stakeToken = stakeToken.toHexString()
  }
  const requestToken = convictionVoting.requestToken()
  const requestTokenId = loadTokenData(requestToken)
  if(requestTokenId){
    config.requestToken = requestToken.toHexString()
  }

  const convictionVotingEntity = loadOrCreateConvictionVoting(appAddress)

  // Load conviction params
  config.decay = convictionVoting.decay()
  config.weight = convictionVoting.weight()
  config.maxRatio = convictionVoting.maxRatio()
  config.pctBase = convictionVoting.D()
  config.totalStaked = convictionVoting.totalStaked()
  config.maxStakedProposals = convictionVoting.MAX_STAKED_PROPOSALS().toI32()
  config.minThresholdStakePercentage = convictionVoting.minThresholdStakePercentage()
  config.convictionVoting = appAddress.toHexString()
  config.save()

  convictionVotingEntity.config = config.id
  convictionVotingEntity.save()
}

function loadOrCreateConvictionVoting(convictionVotingAddress: Address): DisputableConvictionVotingEntity {
  let convictionVoting = DisputableConvictionVotingEntity.load(convictionVotingAddress.toHexString())
  if (convictionVoting === null) {
    const convictionVotingApp = ConvictionVotingContract.bind(convictionVotingAddress)
    convictionVoting = new DisputableConvictionVotingEntity(convictionVotingAddress.toHexString())
    convictionVoting.dao = convictionVotingApp.kernel()
  }
  return convictionVoting!
}

export function getProposalEntityId(
  appAddress: Address,
  proposalId: BigInt
): string {
  return (
    'appAddress:' +
    appAddress.toHexString() +
    '-proposalId:' +
    proposalId.toHexString()
  )
}

export function getProposalEntity(
  appAddress: Address,
  proposalId: BigInt
): ProposalEntity | null {
  const proposalEntityId = getProposalEntityId(appAddress, proposalId)

  let proposal = ProposalEntity.load(proposalEntityId)
  if (!proposal) {
    proposal = new ProposalEntity(proposalEntityId)
    proposal.number = proposalId
    proposal.stakes = []
    proposal.status = STATUS_ACTIVE
    proposal.totalTokensStaked = BigInt.fromI32(0)
    proposal.creator = Bytes.fromHexString('0x') as Bytes
    proposal.challengeId = BigInt.fromI32(0)
    proposal.challenger = Address.fromString('0x0000000000000000000000000000000000000000')
    proposal.challengeEndDate = BigInt.fromI32(0)
  }

  return proposal
}

export function getStakeEntityId(proposalId: BigInt, entity: Bytes): string {
  return proposalId.toHexString() + '-entity:' + entity.toHexString()
}

export function getStakeEntity(
  proposal: ProposalEntity | null,
  entity: Bytes
): StakeEntity | null {
  const stakeId = getStakeEntityId(proposal.number, entity)

  let stake = StakeEntity.load(stakeId)
  if (!stake) {
    stake = new StakeEntity(stakeId)
    stake.entity = entity
    stake.proposal = proposal.id
  }

  return stake
}
export function getStakeHistoryEntityId(
  proposalId: BigInt,
  entity: Bytes,
  timestamp: BigInt
): string {
  return (
    proposalId.toHexString() +
    '-entity:' +
    entity.toHexString() +
    '-time:' +
    timestamp.toString()
  )
}

export function getStakeHistoryEntity(
  proposal: ProposalEntity | null,
  entity: Bytes,
  blockNumber: BigInt
): StakeHistoryEntity | null {
  const stakeHistoryId = getStakeHistoryEntityId(
    proposal.number,
    entity,
    blockNumber
  )

  const stakeHistory = new StakeHistoryEntity(stakeHistoryId)
  stakeHistory.proposalId = proposal.number
  stakeHistory.entity = entity
  stakeHistory.time = blockNumber

  return stakeHistory
}

export function getOrgAddress(appAddress: Address): Address {
  const convictionVoting = ConvictionVotingContract.bind(appAddress)
  return convictionVoting.kernel()
}
