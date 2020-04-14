import React from 'react'
import styled from 'styled-components'
import PropTypes from 'prop-types'

import { DropDown, GU, textStyle, Tag, useTheme } from '@aragon/ui'

const DropwdownFilter = React.memo(
  ({
    proposalStatusFilter,
    handleProposalStatusFilterChange,
    proposalsSize = -1,
  }) => {
    const theme = useTheme()
    return (
      <DropdownFilterWrapper>
        <DropDown
          header="Support"
          placeholder="All"
          selected={proposalStatusFilter}
          onChange={handleProposalStatusFilterChange}
          items={[
            <div>
              All
              {proposalsSize !== -1 && (
                <SizeTagWrapper theme={theme.info}>
                  <Tag limitDigits={4} label={proposalsSize} size="small" />
                </SizeTagWrapper>
              )}
            </div>,
            'Supported',
            'Not Supported',
          ]}
        />
      </DropdownFilterWrapper>
    )
  }
)

const DropdownFilterWrapper = styled.div`
  display: grid;
  grid-template-columns: auto auto auto 1fr;
  align-items: center;
  grid-column-gap: ${2 * GU}px;
`

const SizeTagWrapper = styled.span`
  margin-left: ${1.5 * GU}px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme};
  ${textStyle('label3')};
`
DropwdownFilter.propTypes = {
  proposalsSize: PropTypes.number,
  proposalStatusFilter: PropTypes.number.isRequired,
  handleProposalStatusFilterChange: PropTypes.func.isRequired,
}

export default DropwdownFilter
