import { QueryResult } from '@aragon/connect-thegraph'
import { Proposal as ProposalGql, Stake as StakeGql } from '../queries/types'
import Proposal, { ProposalData } from '../entities/Proposal'
import { StakeData } from '../entities/Stake'

export function parseProposals(
  result: QueryResult,
  connector: any
): Proposal[] {
  const proposals = result.data.proposals

  if (!proposals) {
    throw new Error('Unable to parse proposals.')
  }

  const datas = proposals.map(
    (proposal: ProposalGql): ProposalData => {
      const stakes = proposal.stakes.map((stake: StakeGql): StakeData => stake)

      return {
        ...proposal,
        stakes,
      }
    }
  )

  return datas.map((data: ProposalData) => {
    return new Proposal(data, connector)
  })
}
