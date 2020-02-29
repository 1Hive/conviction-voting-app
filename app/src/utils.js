export const PROPOSAL_STATUS_OPEN = 1
export const PROPOSAL_STATUS_ACCEPTED = 2

export function getProposalStatus(proposal) {
  if (proposal.executed) {
    return PROPOSAL_STATUS_ACCEPTED
  } else {
    return PROPOSAL_STATUS_OPEN
  }
}
