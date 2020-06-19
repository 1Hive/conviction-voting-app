import { QueryResult } from '@aragon/connect-thegraph'
import { Proposal as ProposalDataGql } from '../queries/types'
import Proposal, { ProposalData } from '../entities/Proposal'

export function parseProposals(
  result: QueryResult,
  connector: any
): Proposal[] {
  const proposals = result.data.proposals

  if (!proposals) {
    throw new Error('Unable to parse proposals.')
  }

  const convertedProposals =  proposals.map((data: ProposalData) => {
    return new Proposal(data, connector)
  })

  return convertedProposals
}
