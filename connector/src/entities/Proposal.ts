import Cast from './Stake'
import Entity from './ConvictionVotingEntity'
import ConvictionVotingConnector from '../connector'

export interface ProposalData {
  id: string
  number: string
  name: string
  link: string
  creator: string
  beneficiary: string
  requestedAmount: string
  executed: boolean
  totalTokensStaked: string
}

export default class Proposal extends Entity implements ProposalData {
  readonly id!: string

  readonly number!: string

  readonly name!: string

  readonly link!: string

  readonly creator!: string

  readonly beneficiary!: string

  readonly requestedAmount!: string

  readonly executed!: boolean

  readonly totalTokensStaked!: string

  constructor(data: ProposalData, connector: ConvictionVotingConnector) {
    super(connector)

    Object.assign(this, data)
  }

  async stakes({ first = 1000, skip = 0 } = {}): Promise<Cast[]> {
    return this._connector.stakeHistory(this.id, first, skip)
  }

  onStakes(callback: Function): { unsubscribe: Function } {
    return this._connector.onStakeHistory(this.id, callback)
  }
}
