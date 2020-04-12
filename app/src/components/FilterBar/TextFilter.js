import React from 'react'
import PropTypes from 'prop-types'

import {
  Button,
  GU,
  IconSearch,
  Popover,
  SearchInput,
  useLayout,
} from '@aragon/ui'

const TextFilter = React.memo(
  ({
    textFilter,
    updateTextFilter,
    placeholder = '',
    openerRef,
    visible,
    setVisible,
    onClick,
  }) => {
    const { layoutName } = useLayout()
    const compactMode = layoutName === 'small'

    return !compactMode ? (
      <SearchInput
        value={textFilter}
        onChange={updateTextFilter}
        placeholder={placeholder}
      />
    ) : (
      <React.Fragment>
        <Button
          display="icon"
          icon={<IconSearch />}
          ref={openerRef}
          label="Search Proposal"
          onClick={onClick}
        />
        <TextFilterPopover
          textFilter={textFilter}
          updateTextFilter={updateTextFilter}
          visible={visible}
          setVisible={setVisible}
          opener={openerRef.current}
        />
      </React.Fragment>
    )
  }
)

const TextFilterPopover = ({
  textFilter,
  updateTextFilter,
  visible,
  setVisible,
  opener,
}) => (
  <Popover
    visible={visible}
    opener={opener}
    onClose={() => setVisible(false)}
    css={`
      padding: ${1.5 * GU}px;
    `}
    placement="bottom-end"
  >
    <SearchInput value={textFilter} onChange={updateTextFilter} />
  </Popover>
)

TextFilterPopover.propTypes = {
  textFilter: PropTypes.string.isRequired,
  updateTextFilter: PropTypes.func.isRequired,
  opener: PropTypes.object,
  visible: PropTypes.bool.isRequired,
  setVisible: PropTypes.func.isRequired,
}

TextFilter.propTypes = {
  textFilter: PropTypes.string.isRequired,
  updateTextFilter: PropTypes.func.isRequired,
  openerRef: PropTypes.object,
  visible: PropTypes.bool.isRequired,
  setVisible: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}

export default TextFilter
