export const PROPOSAL_STATUS_OPEN = 1
export const PROPOSAL_STATUS_ACCEPTED = 2

export const PROPOSAL_STATUS_SUPPORTED = 1
export const PROPOSAL_STATUS_NOT_SUPPORTED = 2

export function getProposalSupportStatus(stakes, proposal) {
  return stakes.has(proposal.id)
    ? PROPOSAL_STATUS_SUPPORTED
    : PROPOSAL_STATUS_NOT_SUPPORTED
}

export function getProposalExecutionStatus({ executed }) {
  if (executed) {
    return PROPOSAL_STATUS_ACCEPTED
  } else {
    return PROPOSAL_STATUS_OPEN
  }
}
