import { StakeData } from './Stake'
import StakeHistory from './StakeHistory'
import Entity from './ConvictionVotingEntity'
import ConvictionVotingConnector from '../connector'

export interface ProposalData {
  id: string
  number: string
  name: string
  link?: string | null
  creator: string
  beneficiary?: string | null
  requestedAmount?: string | null
  executed: boolean
  totalTokensStaked: string
  stakes: StakeData[]
  appAddress: string
}

export default class Proposal extends Entity implements ProposalData {
  readonly id!: string

  readonly number!: string

  readonly name!: string

  readonly link?: string | null

  readonly creator!: string

  readonly beneficiary?: string | null

  readonly requestedAmount?: string | null

  readonly executed!: boolean

  readonly totalTokensStaked!: string

  readonly stakes!: StakeData[]

  readonly appAddress!: string

  constructor(data: ProposalData, connector: ConvictionVotingConnector) {
    super(connector)

    Object.assign(this, data)
  }

  async stakesHistory({ first = 1000, skip = 0 } = {}): Promise<
    StakeHistory[]
  > {
    return this._connector.stakesHistory(this.appAddress, this.id, first, skip)
  }

  onStakesHistory(callback: Function): { unsubscribe: Function } {
    return this._connector.onStakesHistory(this.appAddress, this.id, callback)
  }
}
