import { GraphQLWrapper } from '@aragon/connect-thegraph'
import * as queries from './queries'
import Config from './entities/Config'
import Proposal from './entities/Proposal'
import StakeHistory from './entities/StakeHistory'

import { parseProposals, parseStakes, parseConfig } from './parsers'

export default class ConvictionVotingConnector extends GraphQLWrapper {
  async config(id: string): Promise<Config> {
    return this.performQueryWithParser(
      queries.CONFIG('query'),
      { id },
      parseConfig
    )
  }

  async proposals(
    appAddress: string,
    first: number,
    skip: number
  ): Promise<Proposal[]> {
    return this.performQueryWithParser(
      queries.ALL_PROPOSALS('query'),
      { appAddress, first, skip },
      parseProposals
    )
  }

  onProposals(
    appAddress: string,
    callback: Function
  ): { unsubscribe: Function } {
    return this.subscribeToQueryWithParser(
      queries.ALL_PROPOSALS('subscription'),
      { appAddress, first: 1000, skip: 0 },
      callback,
      parseProposals
    )
  }

  async stakesHistory(
    appAddress: string,
    first: number,
    skip: number
  ): Promise<StakeHistory[]> {
    return this.performQueryWithParser(
      queries.ALL_STAKE_HISTORY('query'),
      { appAddress, first, skip },
      parseStakes
    )
  }

  onStakesHistory(
    appAddress: string,
    callback: Function
  ): { unsubscribe: Function } {
    return this.subscribeToQueryWithParser(
      queries.STAKE_HISTORY_BY_PROPOSAL('subscription'),
      { appAddress, first: 1000, skip: 0 },
      callback,
      parseStakes
    )
  }

  async stakesHistoryByProposal(
    appAddress: string,
    proposalId: string,
    first: number,
    skip: number
  ): Promise<StakeHistory[]> {
    return this.performQueryWithParser(
      queries.STAKE_HISTORY_BY_PROPOSAL('query'),
      { appAddress, proposalId, first, skip },
      parseStakes
    )
  }

  onStakesHistoryByProposal(
    appAddress: string,
    proposalId: string,
    callback: Function
  ): { unsubscribe: Function } {
    return this.subscribeToQueryWithParser(
      queries.STAKE_HISTORY_BY_PROPOSAL('subscription'),
      { appAddress, proposalId, first: 1000, skip: 0 },
      callback,
      parseStakes
    )
  }
}
