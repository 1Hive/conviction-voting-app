import React from 'react'
import PropTypes from 'prop-types'
import { GU, useTheme, useLayout } from '@aragon/ui'
import { useAragonApi } from '@aragon/api-react'
import MenuButton from './MenuButton'

function AppHeader({ heading, action1, action2 }) {
  const theme = useTheme()
  const { width } = useLayout()
  const { requestMenu, displayMenuButton } = useAragonApi()

  return (
    <div
      css={
        width === 360
          ? `
        padding: 1rem;
        background: white;
        margin-bottom: 0.5rem;
        box-shadow: 0px 2px 3px rgba(217, 222, 231, 0.5);
      `
          : `
        padding-top: ${3 * GU}px;
        padding-bottom: ${3 * GU}px;
      `
      }
    >
      <div
        css={`
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: ${5 * GU}px;
        `}
      >
        {displayMenuButton && <MenuButton onClick={requestMenu} />}
        <div>
          {typeof heading === 'string' ? (
            <h1
              css={`
                font-size: 26px;
                color: ${theme.content};
              `}
            >
              {heading}
            </h1>
          ) : (
            heading
          )}
        </div>
        <div>
          {action1}
          {action2 && action2}
        </div>
      </div>
    </div>
  )
}

AppHeader.propTypes = {
  heading: PropTypes.node,
  action1: PropTypes.node,
  action2: PropTypes.node,
}

export default AppHeader
