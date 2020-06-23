import Config from './Config'
import ConvictionVotingEntity from './ConvictionVotingEntity'
import ConvictionVotingConnector from '../connector'
import Proposal from './Proposal'
import StakeHistory from './StakeHistory'

export default class ConvictionVoting extends ConvictionVotingEntity {
  readonly appAddress: string

  constructor(appAddress: string, subgraphUrl: string, verbose = false) {
    super(new ConvictionVotingConnector(subgraphUrl, verbose))

    this.appAddress = appAddress
  }

  async config(): Promise<Config> {
    return this._connector.config(this.appAddress)
  }

  async proposals({ first = 1000, skip = 0 } = {}): Promise<Proposal[]> {
    return this._connector.proposals(this.appAddress, first, skip)
  }

  onProposals(callback: Function): { unsubscribe: Function } {
    return this._connector.onProposals(this.appAddress, callback)
  }

  async stakesHistory({ first = 1000, skip = 0 } = {}): Promise<
    StakeHistory[]
  > {
    return this._connector.stakesHistory(this.appAddress, first, skip)
  }

  onStakesHistory(callback: Function): { unsubscribe: Function } {
    return this._connector.onStakesHistory(this.appAddress, callback)
  }
}
