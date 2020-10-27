import Proposal from './Proposal'
import StakeHistory from './StakeHistory'
import {
  IConvictionVotingConnector,
  Address,
  SubscriptionHandler,
} from '../types'

export default class ConvictionVoting {
  #address: Address
  #connector: IConvictionVotingConnector

  constructor(connector: IConvictionVotingConnector, address: Address) {
    this.#connector = connector
    this.#address = address
  }

  async disconnect() {
    await this.#connector.disconnect()
  }

  async proposals({ first = 1000, skip = 0 } = {}): Promise<Proposal[]> {
    return this.#connector.proposals(this.#address, first, skip)
  }

  onConfig(callback: Function): SubscriptionHandler {
    return this.#connector.onConfig(this.#address, callback)
  }


  onProposals(
    { first = 1000, skip = 0 } = {},
    callback: Function
  ): SubscriptionHandler {
    return this.#connector.onProposals(this.#address, first, skip, callback)
  }

  async stakesHistory({ first = 1000, skip = 0 } = {}): Promise<
    StakeHistory[]
  > {
    return this.#connector.stakesHistory(this.#address, first, skip)
  }

  onStakesHistory(
    { first = 1000, skip = 0 } = {},
    callback: Function
  ): SubscriptionHandler {
    return this.#connector.onStakesHistory(this.#address, first, skip, callback)
  }

  onStakesHistoryByProposal(proposalId: string,
    { first = 1000, skip = 0 } = {},
    callback: Function
  ): SubscriptionHandler {
    return this.#connector.onStakesHistoryByProposal(this.#address, proposalId, first, skip, callback)
  }
}
