import React, { useState, useRef, useCallback } from 'react'
import styled from 'styled-components'
import PropTypes from 'prop-types'

import TextFilter from './TextFilter'
import DropdownFilter from './DropdownFilter'

const FilterBar = React.memo(
  ({
    proposalsSize = 0,
    proposalStatusFilter,
    proposalTextFilter,
    disableDropDownFilter = false,
    handleProposalStatusFilterChange,
    handleTextFilterChange,
  }) => {
    const [textFieldVisible, setTextFieldVisible] = useState(false)
    const textFilterOpener = useRef(null)

    const handlerTextFilterClick = useCallback(() => {
      setTextFieldVisible(true)
    }, [setTextFieldVisible])

    return (
      <FilterBarWrapper disableDropDown={disableDropDownFilter}>
        {!disableDropDownFilter && (
          <DropdownFilter
            proposalsSize={proposalsSize}
            proposalStatusFilter={proposalStatusFilter}
            handleProposalStatusFilterChange={handleProposalStatusFilterChange}
          />
        )}
        <TextFilter
          textFilter={proposalTextFilter}
          updateTextFilter={handleTextFilterChange}
          placeholder="Search by name"
          visible={textFieldVisible}
          setVisible={setTextFieldVisible}
          openerRef={textFilterOpener}
          onClick={handlerTextFilterClick}
        />
      </FilterBarWrapper>
    )
  }
)

const FilterBarWrapper = styled.div`
  display: flex;
  justify-content: ${({ disableDropDown }) =>
    disableDropDown ? 'flex-end' : 'space-between'};
`

FilterBar.propTypes = {
  proposalsSize: PropTypes.number,
  proposalStatusFilter: PropTypes.number.isRequired,
  proposalTextFilter: PropTypes.string.isRequired,
  handleProposalStatusFilterChange: PropTypes.func.isRequired,
  handleTextFilterChange: PropTypes.func.isRequired,
  disableDropDownFilter: PropTypes.bool,
}

export default FilterBar
