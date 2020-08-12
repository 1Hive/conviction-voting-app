import {
  StakeData,
  ProposalData,
  IConvictionVotingConnector,
  SubscriptionHandler,
} from '../types'
import StakeHistory from './StakeHistory'

export default class Proposal {
  #connector: IConvictionVotingConnector

  readonly id: string
  readonly number: string
  readonly name: string
  readonly link?: string
  readonly creator: string
  readonly beneficiary?: string
  readonly requestedAmount?: string
  readonly status: string
  readonly totalTokensStaked: string
  readonly stakes: StakeData[]
  readonly appAddress: string

  constructor(data: ProposalData, connector: IConvictionVotingConnector) {
    this.#connector = connector

    this.id = data.id
    this.number = data.number
    this.name = data.name
    this.link = data.link
    this.creator = data.creator
    this.beneficiary = data.beneficiary
    this.requestedAmount = data.requestedAmount
    this.status = data.status
    this.totalTokensStaked = data.totalTokensStaked
    this.stakes = data.stakes
    this.appAddress = data.appAddress
  }

  async stakesHistory({ first = 1000, skip = 0 } = {}): Promise<
    StakeHistory[]
  > {
    return this.#connector.stakesHistoryByProposal(
      this.appAddress,
      this.number,
      first,
      skip
    )
  }

  onStakesHistory(
    { first = 1000, skip = 0 } = {},
    callback: Function
  ): SubscriptionHandler {
    return this.#connector.onStakesHistoryByProposal(
      this.appAddress,
      this.number,
      first,
      skip,
      callback
    )
  }
}
