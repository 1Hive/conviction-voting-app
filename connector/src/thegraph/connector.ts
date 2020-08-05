import { GraphQLWrapper, QueryResult } from '@aragon/connect-thegraph'

import { IConvictionVotingConnector, SubscriptionHandler } from '../types'
import Config from '../models/Config'
import Proposal from '../models/Proposal'
import StakeHistory from '../models/StakeHistory'
import * as queries from './queries'
import { parseProposals, parseStakes, parseConfig } from './parsers'

export function subgraphUrlFromChainId(chainId: number) {
  if (chainId === 1) {
    return 'https://api.thegraph.com/subgraphs/name/1hive/aragon-conviction-voting-mainnet'
  }
  if (chainId === 4) {
    return 'https://api.thegraph.com/subgraphs/name/1hive/aragon-conviction-voting-rinkeby'
  }
  if (chainId === 100) {
    return 'https://api.thegraph.com/subgraphs/name/1hive/aragon-conviction-voting-xdai'
  }
  return null
}

export default class ConvictionVotingConnectorTheGraph
  implements IConvictionVotingConnector {
  #gql: GraphQLWrapper

  constructor(subgraphUrl: string, verbose: boolean = false) {
    if (!subgraphUrl) {
      throw new Error(
        'ConvictionVotingConnector requires subgraphUrl to be passed.'
      )
    }
    this.#gql = new GraphQLWrapper(subgraphUrl, verbose)
  }

  async disconnect() {
    this.#gql.close()
  }

  async config(id: string): Promise<Config> {
    return this.#gql.performQueryWithParser(
      queries.CONFIG('query'),
      { id },
      (result: QueryResult) => parseConfig(result, this)
    )
  }

  async proposals(
    appAddress: string,
    first: number,
    skip: number
  ): Promise<Proposal[]> {
    return this.#gql.performQueryWithParser(
      queries.ALL_PROPOSALS('query'),
      { appAddress, first, skip },
      (result: QueryResult) => parseProposals(result, this)
    )
  }

  onProposals(
    appAddress: string,
    first: number,
    skip: number,
    callback: Function
  ): SubscriptionHandler {
    return this.#gql.subscribeToQueryWithParser(
      queries.ALL_PROPOSALS('subscription'),
      { appAddress, first, skip },
      callback,
      (result: QueryResult) => parseProposals(result, this)
    )
  }

  async stakesHistory(
    appAddress: string,
    first: number,
    skip: number
  ): Promise<StakeHistory[]> {
    return this.#gql.performQueryWithParser(
      queries.ALL_STAKE_HISTORY('query'),
      { appAddress, first, skip },
      (result: QueryResult) => parseStakes(result, this)
    )
  }

  onStakesHistory(
    appAddress: string,
    first: number,
    skip: number,
    callback: Function
  ): SubscriptionHandler {
    return this.#gql.subscribeToQueryWithParser(
      queries.ALL_STAKE_HISTORY('subscription'),
      { appAddress, first, skip },
      callback,
      (result: QueryResult) => parseStakes(result, this)
    )
  }

  async stakesHistoryByProposal(
    appAddress: string,
    proposalId: string,
    first: number,
    skip: number
  ): Promise<StakeHistory[]> {
    return this.#gql.performQueryWithParser(
      queries.STAKE_HISTORY_BY_PROPOSAL('query'),
      { appAddress, proposalId, first, skip },
      (result: QueryResult) => parseStakes(result, this)
    )
  }

  onStakesHistoryByProposal(
    appAddress: string,
    proposalId: string,
    first: number,
    skip: number,
    callback: Function
  ): SubscriptionHandler {
    return this.#gql.subscribeToQueryWithParser(
      queries.STAKE_HISTORY_BY_PROPOSAL('subscription'),
      { appAddress, proposalId, first, skip },
      callback,
      (result: QueryResult) => parseStakes(result, this)
    )
  }
}
