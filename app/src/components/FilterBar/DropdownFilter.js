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
        css={`
          margin-left: ${1.5 * GU}px;
        `}
      />
    )
  }
)

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
