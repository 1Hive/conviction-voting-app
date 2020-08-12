import Config from './models/Config'
import Proposal from './models/Proposal'
import StakeHistory from './models/StakeHistory'

export type SubscriptionHandler = { unsubscribe: () => void }

export type Address = string

export interface StakeHistoryData {
  id: string
  entity: string
  proposalId: string
  tokensStaked: string
  totalTokensStaked: string
  time: string
  conviction: string
}

export interface TokenData {
  id: string
  name: string
  symbol: string
  decimals: number
}

export interface ConfigData {
  id: string
  decay: string
  weight: string
  maxRatio: string
  pctBase: string
  stakeToken: TokenData
  requestToken: TokenData
  maxStakedProposals: number
  minThresholdStakePercentage: String
}

export interface StakeData {
  id: string
  entity: string
  amount: string
}

export interface ProposalData {
  id: string
  number: string
  name: string
  link?: string
  creator: string
  beneficiary?: string
  requestedAmount?: string
  status: string
  totalTokensStaked: string
  stakes: StakeData[]
  appAddress: string
}

export interface IConvictionVotingConnector {
  disconnect(): Promise<void>
  config(id: string): Promise<Config>
  proposals(
    appAddress: string,
    first: number,
    skip: number
  ): Promise<Proposal[]>
  onProposals(
    appAddress: string,
    first: number,
    skip: number,
    callback: Function
  ): SubscriptionHandler
  stakesHistory(
    appAddress: string,
    first: number,
    skip: number
  ): Promise<StakeHistory[]>
  onStakesHistory(
    appAddress: string,
    first: number,
    skip: number,
    callback: Function
  ): SubscriptionHandler
  stakesHistoryByProposal(
    appAddress: string,
    proposalId: string,
    first: number,
    skip: number
  ): Promise<StakeHistory[]>
  onStakesHistoryByProposal(
    appAddress: string,
    proposalId: string,
    first: number,
    skip: number,
    callback: Function
  ): SubscriptionHandler
}
