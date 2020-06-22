import ConvictionVotingConnector from '../connector'

export default class ConvictionVotingEntity {
  protected _connector: ConvictionVotingConnector

  constructor(connector: ConvictionVotingConnector) {
    this._connector = connector
  }
}
