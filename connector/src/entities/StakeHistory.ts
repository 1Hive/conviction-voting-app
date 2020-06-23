import Entity from './ConvictionVotingEntity'
import ConvictionVotingConnector from '../connector'

export interface StakeHistoryData {
  id: string
  entity: string
  proposalId: string
  tokensStaked: string
  totalTokensStaked: string
  time: string
  conviction: string
}

export default class StakeHistory extends Entity implements StakeHistoryData {
  readonly id!: string

  readonly entity!: string

  readonly proposalId!: string

  readonly tokensStaked!: string

  readonly totalTokensStaked!: string

  readonly time!: string

  readonly conviction!: string

  constructor(data: StakeHistoryData, connector: ConvictionVotingConnector) {
    super(connector)

    Object.assign(this, data)
  }
}
