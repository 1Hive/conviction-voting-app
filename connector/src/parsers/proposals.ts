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

  const datas = proposals.map(
    (proposal: ProposalDataGql): ProposalDataGql => {
      return proposal
    }
  )

  return datas.map((data: ProposalData) => {
    return new Proposal(data, connector)
  })
}
