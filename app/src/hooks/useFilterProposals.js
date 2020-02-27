import { useState, useEffect, useCallback } from 'react'
import {
  getProposalStatus,
  PROPOSAL_STATUS_OPEN,
  PROPOSAL_STATUS_ACCEPTED,
} from '../utils'

const NULL_FILTER_STATE = -1
const STATUS_FILTER_OPEN = 1
const STATUS_FILTER_CLOSED = 2

function testStatusFilter(filter, proposalStatus) {
  return (
    filter === NULL_FILTER_STATE ||
    (filter === STATUS_FILTER_OPEN &&
      proposalStatus === PROPOSAL_STATUS_OPEN) ||
    (filter === STATUS_FILTER_CLOSED &&
      proposalStatus === PROPOSAL_STATUS_ACCEPTED)
  )
}

const useFilterProposals = proposals => {
  const [filteredProposals, setFilteredProposals] = useState(proposals)
  const [statusFilter, setStatusFilter] = useState(NULL_FILTER_STATE)

  useEffect(() => {
    const filtered = proposals.filter(proposal => {
      const proposalStatus = getProposalStatus(proposal)
      return testStatusFilter(statusFilter, proposalStatus)
    })
    setFilteredProposals(filtered)
  }, [statusFilter, setFilteredProposals, proposals])

  return {
    filteredProposals,
    proposalStatusFilter: statusFilter,
    handleProposalStatusFilterChange: useCallback(
      index => {
        setStatusFilter(index || NULL_FILTER_STATE)
      },
      [setStatusFilter]
    ),
  }
}

export default useFilterProposals
