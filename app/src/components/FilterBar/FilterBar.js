import React, { useState, useRef, useCallback } from 'react'
import { DropDown } from '@aragon/ui'
import styled from 'styled-components'
import PropTypes from 'prop-types'

import TextFilter from './TextFilter'
import DropdownFilter from './DropdownFilter'

const FilterBar = React.memo(
  ({
    proposalsSize = 0,
    proposalStatusFilter,
    proposalTextFilter,
    proposalTypeFilter,
    disableDropDownFilter = false,
    handleProposalStatusFilterChange,
    handleTextFilterChange,
    handleProposalTypeFilterChange,
  }) => {
    const [textFieldVisible, setTextFieldVisible] = useState(false)
    const textFilterOpener = useRef(null)

    const handlerTextFilterClick = useCallback(() => {
      setTextFieldVisible(true)
    }, [setTextFieldVisible])

    return (
      <div
        css={`
          display: flex;
          justify-content: flex-end;
        `}
      >
        <DropDown
          header="Type"
          placeholder="Type"
          selected={proposalTypeFilter}
          onChange={handleProposalTypeFilterChange}
          items={['Funding', 'Signaling']}
        />
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
      </div>
    )
  }
)

FilterBar.propTypes = {
  proposalsSize: PropTypes.number,
  proposalStatusFilter: PropTypes.number.isRequired,
  proposalTextFilter: PropTypes.string.isRequired,
  handleProposalStatusFilterChange: PropTypes.func.isRequired,
  handleTextFilterChange: PropTypes.func.isRequired,
  disableDropDownFilter: PropTypes.bool,
}

export default FilterBar
