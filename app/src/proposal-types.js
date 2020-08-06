import BigNumber from './lib/bigNumber'

export const PROPOSAL_STATUS_OPEN = 1
export const PROPOSAL_STATUS_ACCEPTED = 2

export const PROPOSAL_STATUS_SUPPORTED = 1
export const PROPOSAL_STATUS_NOT_SUPPORTED = 2

export const PROPOSAL_TYPE_FUNDING = 1
export const PROPOSAL_TYPE_SIGNALING = 2

export function getProposalSupportStatus(stakes, proposal) {
  if (stakes.find(stake => stake.proposal === proposal.id)) {
    return PROPOSAL_STATUS_SUPPORTED
  }

  return PROPOSAL_STATUS_NOT_SUPPORTED
}

export function getProposalExecutionStatus({ executed }) {
  if (executed) {
    return PROPOSAL_STATUS_ACCEPTED
  } else {
    return PROPOSAL_STATUS_OPEN
  }
}

export function getProposalType({ requestedAmount }) {
  if (requestedAmount.eq(BigNumber('0'))) {
    return PROPOSAL_TYPE_SIGNALING
  }
  return PROPOSAL_TYPE_FUNDING
}
