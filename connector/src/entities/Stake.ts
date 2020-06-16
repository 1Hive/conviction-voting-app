import ConvictionVotingEntity from './ConvictionVotingEntity'
import ConvictionVotingConnector from '../connector'

export interface StakeData {
  id: string
  entity: string
  proposalId: string
  tokensStaked: string
  totalTokensStaked: string
  time: string
  conviction: string
}

export default class Stake extends ConvictionVotingEntity implements StakeData {
  readonly id!: string

  readonly entity!: string

  readonly proposalId!: string

  readonly tokensStaked!: string

  readonly totalTokensStaked!: string

  readonly time!: string

  readonly conviction!: string

  constructor(data: StakeData, connector: ConvictionVotingConnector) {
    super(connector)

    Object.assign(this, data)
  }
}
