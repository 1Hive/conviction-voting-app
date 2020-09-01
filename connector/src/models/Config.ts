import { TokenData, ConfigData, IConvictionVotingConnector } from '../types'

export default class Config {
  #connector: IConvictionVotingConnector

  readonly id: string
  readonly decay: string
  readonly weight: string
  readonly maxRatio: string
  readonly pctBase: string
  readonly stakeToken: TokenData
  readonly requestToken: TokenData
  readonly maxStakedProposals: number
  readonly minThresholdStakePercentage: String
  readonly totalStaked: number

  constructor(data: ConfigData, connector: IConvictionVotingConnector) {
    this.#connector = connector

    this.id = data.id
    this.decay = data.decay
    this.weight = data.weight
    this.maxRatio = data.maxRatio
    this.pctBase = data.pctBase
    this.stakeToken = data.stakeToken
    this.requestToken = data.requestToken
    this.maxStakedProposals = data.maxStakedProposals
    this.minThresholdStakePercentage = data.minThresholdStakePercentage
    this.totalStaked = data.totalStaked
  }
}
