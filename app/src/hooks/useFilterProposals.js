import { useState, useEffect, useCallback } from 'react'

import useAppLogic from '../app-logic'

import {
  getProposalSupportStatus,
  PROPOSAL_STATUS_SUPPORTED,
  PROPOSAL_STATUS_NOT_SUPPORTED,
  PROPOSAL_STATUS_OPEN,
  PROPOSAL_STATUS_ACCEPTED,
  getProposalExecutionStatus,
} from '../proposal-types'
import { checkInitialLetters } from '../lib/search-utils'

const NULL_FILTER_STATE = -1
const STAKE_STATUS_FILTER_SUPPORTED = 1
const STAKE_STATUS_FILTER_NOT_SUPPORTED = 2
const EXECUTION_STATUS_FILTER_OPEN = 0
const EXECUTION_STATUS_FILTER_ACCEPTED = 1

function testSupportFilter(filter, proposalStatus) {
  return (
    filter === NULL_FILTER_STATE ||
    (filter === STAKE_STATUS_FILTER_SUPPORTED &&
      proposalStatus === PROPOSAL_STATUS_SUPPORTED) ||
    (filter === STAKE_STATUS_FILTER_NOT_SUPPORTED &&
      proposalStatus === PROPOSAL_STATUS_NOT_SUPPORTED)
  )
}

function testExecutionFilter(filter, proposalStatus) {
  return (
    (filter === EXECUTION_STATUS_FILTER_OPEN &&
      proposalStatus === PROPOSAL_STATUS_OPEN) ||
    (filter === EXECUTION_STATUS_FILTER_ACCEPTED &&
      proposalStatus === PROPOSAL_STATUS_ACCEPTED)
  )
}
function testSearchFilter(proposalName, textSearch) {
  return (
    proposalName.toUpperCase().includes(textSearch.toUpperCase()) ||
    checkInitialLetters(proposalName, textSearch)
  )
}

const useFilterProposals = (proposals, myStakes) => {
  const [filteredProposals, setFilteredProposals] = useState(proposals)
  const [supportFilter, setSupportFilter] = useState(NULL_FILTER_STATE)
  const [executionFilter, setExecutionFilter] = useState(
    EXECUTION_STATUS_FILTER_OPEN
  )
  const [textSearch, setTextSearch] = useState('')
  useEffect(() => {
    const filtered = proposals.filter(proposal => {
      const proposalExecutionStatus = getProposalExecutionStatus(proposal)
      const proposalSupportStatus = getProposalSupportStatus(myStakes, proposal)

      return (
        testExecutionFilter(executionFilter, proposalExecutionStatus) &&
        testSupportFilter(supportFilter, proposalSupportStatus) &&
        testSearchFilter(proposal.name, textSearch)
      )
    })

    setFilteredProposals(filtered)
  }, [
    supportFilter,
    executionFilter,
    setFilteredProposals,
    proposals,
    textSearch,
  ])

  return {
    filteredProposals,
    proposalExecutionStatusFilter: executionFilter,
    proposalSupportStatusFilter: supportFilter,
    proposalTextFilter: textSearch,
    handleProposalExecutionFilterChange: useCallback(
      index => setExecutionFilter(index),
      [setExecutionFilter]
    ),
    handleProposalSupportFilterChange: useCallback(
      index => setSupportFilter(index || NULL_FILTER_STATE),
      [setSupportFilter]
    ),
    handleSearchTextFilterChange: useCallback(
      textSearch => {
        setTextSearch(textSearch)
      },
      [setTextSearch]
    ),
  }
}

export default useFilterProposals
