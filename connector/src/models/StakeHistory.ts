import { StakeHistoryData, IConvictionVotingConnector } from '../types'

export default class StakeHistory {
  #connector: IConvictionVotingConnector

  readonly id: string
  readonly entity: string
  readonly proposalId: string
  readonly tokensStaked: string
  readonly totalTokensStaked: string
  readonly time: string
  readonly conviction: string

  constructor(data: StakeHistoryData, connector: IConvictionVotingConnector) {
    this.#connector = connector

    this.id = data.id
    this.entity = data.entity
    this.proposalId = data.proposalId
    this.tokensStaked = data.tokensStaked
    this.totalTokensStaked = data.totalTokensStaked
    this.time = data.time
    this.conviction = data.conviction
  }
}
