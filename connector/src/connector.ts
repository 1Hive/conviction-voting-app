import { GraphQLWrapper } from '@aragon/connect-thegraph'
import * as queries from './queries'
import Proposal from './entities/Proposal'
import Stake from './entities/Stake'

import { parseProposals, parseStakes } from './parsers'

export default class ConvictionVotingConnector extends GraphQLWrapper {
  async proposalsForApp(
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

  onProposalsForApp(
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

  async stakeHistory(
    appAddress: string,
    first: number,
    skip: number
  ): Promise<Stake[]> {
    return this.performQueryWithParser(
      queries.STAKE_HISTORY('query'),
      { appAddress, first, skip },
      parseStakes
    )
  }

  onStakeHistory(
    appAddress: string,
    callback: Function
  ): { unsubscribe: Function } {
    return this.subscribeToQueryWithParser(
      queries.STAKE_HISTORY('subscription'),
      { appAddress, first: 1000, skip: 0 },
      callback,
      parseStakes
    )
  }
}
