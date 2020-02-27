export function noop() {}

export const PROPOSAL_STATUS_OPEN = 1
export const PROPOSAL_STATUS_ACCEPTED = 2

export function getProposalStatus(proposal) {
  switch (proposal.state) {
    case PROPOSAL_STATUS_ACCEPTED:
      return PROPOSAL_STATUS_ACCEPTED
    default:
      return PROPOSAL_STATUS_OPEN
  }
}
