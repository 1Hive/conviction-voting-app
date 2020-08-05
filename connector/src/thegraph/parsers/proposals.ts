import { QueryResult } from '@aragon/connect-thegraph'
import Proposal from '../../models/Proposal'
import { ProposalData, StakeData } from '../../types'

export function parseProposals(
  result: QueryResult,
  connector: any
): Proposal[] {
  const proposals = result.data.proposals

  if (!proposals) {
    throw new Error('Unable to parse proposals.')
  }

  const datas = proposals.map((proposal: ProposalData) => {
    const stakes = proposal.stakes.map((stake: StakeData) => stake)

    return {
      ...proposal,
      stakes,
    }
  })

  return datas.map((data: ProposalData) => {
    return new Proposal(data, connector)
  })
}
