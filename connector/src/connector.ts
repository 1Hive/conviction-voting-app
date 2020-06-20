import { GraphQLWrapper } from '@aragon/connect-thegraph'
import * as queries from './queries'
import Config from './entities/Config'
import Proposal from './entities/Proposal'
import Stake from './entities/Stake'

import { parseProposals, parseStakes, parseConfig } from './parsers'

export default class ConvictionVotingConnector extends GraphQLWrapper {
  async config(appAddress: string): Promise<Config> {
    return this.performQueryWithParser(
      queries.CONFIG('query'),
      { appAddress },
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
    proposalId: string,
    first: number,
    skip: number
  ): Promise<Stake[]> {
    return this.performQueryWithParser(
      queries.STAKE_HISTORY('query'),
      { appAddress, proposalId, first, skip },
      parseStakes
    )
  }

  onStakesHistory(
    appAddress: string,
    proposalId: string,
    callback: Function
  ): { unsubscribe: Function } {
    return this.subscribeToQueryWithParser(
      queries.STAKE_HISTORY('subscription'),
      { appAddress, proposalId, first: 1000, skip: 0 },
      callback,
      parseStakes
    )
  }
}
