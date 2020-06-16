import ConvictionVotingEntity from './ConvictionVotingEntity'
import Proposal from './Proposal'
import ConvictionVotingConnector from '../connector'

export default class ConvictionVoting extends ConvictionVotingEntity {
  readonly appAddress: string

  constructor(appAddress: string, subgraphUrl: string, verbose = false) {
    super(new ConvictionVotingConnector(subgraphUrl, verbose))

    this.appAddress = appAddress
  }

  async proposals({ first = 1000, skip = 0 } = {}): Promise<Proposal[]> {
    return this._connector.proposalsForApp(this.appAddress, first, skip)
  }

  onProposals(callback: Function): { unsubscribe: Function } {
    return this._connector.onProposalsForApp!(this.appAddress, callback)
  }
}
