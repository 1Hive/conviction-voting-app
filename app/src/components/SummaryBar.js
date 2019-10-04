import React from 'react'
import styled from 'styled-components'
import { springs, useTheme } from '@aragon/ui'
import { Spring, animated } from 'react-spring'

function SummaryBar({
  show = true,
  firstSize = 0,
  secondSize = 0,
  thirdSize = 0,
  requiredSize = 0,
  compact = false,
  ...props
}) {
  const theme = useTheme()
  // Third part overlaps first and second if it is negative
  const thirdBegins = firstSize + secondSize + Math.min(thirdSize, 0)
  return (
    <Spring
      from={{ progress: 0 }}
      to={{ progress: Number(show) }}
      config={springs.lazy}
      native
    >
      {({ progress }) => (
        <Main compact={compact} {...props}>
          <CombinedBar>
            <BarPart
              style={{
                backgroundColor: theme.infoSurfaceContent,
                transform: progress.interpolate(
                  v => `scale3d(${firstSize * v}, 1, 1)`
                ),
              }}
            />
            <BarPart
              style={{
                backgroundColor: theme.info,
                transform: progress.interpolate(
                  v => `
                    translate3d(${100 * firstSize * v}%, 0, 0)
                    scale3d(${secondSize * v}, 1, 1)
                  `
                ),
              }}
            />
            <BarPart
              style={{
                backgroundColor: thirdSize > 0 ? theme.info : theme.negative,
                opacity: thirdSize > 0 ? 0.2 : 0.8,
                transform: progress.interpolate(
                  v => `
                    translate3d(
                      ${100 * thirdBegins * v}%, 0, 0)
                    scale3d(${Math.abs(thirdSize) * v}, 1, 1)
                  `
                ),
              }}
            />
          </CombinedBar>
          <RequiredSeparatorClip>
            <RequiredSeparatorWrapper
              style={{
                transform: progress.interpolate(
                  v => `
                    translate3d(${100 * requiredSize * v}%, 0, 0)
                    scale3d(1, ${requiredSize > 0 ? v : 0}, 1)
                  `
                ),
              }}
            >
              <RequiredSeparator />
            </RequiredSeparatorWrapper>
          </RequiredSeparatorClip>
        </Main>
      )}
    </Spring>
  )
}

const Main = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  height: ${({ compact }) => (compact ? '30px' : '50px')};
  margin: ${({ compact }) => (compact ? '0' : '10px 0')};
`

const CombinedBar = styled.div`
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 6px;
  border-radius: 2px;
  background: #edf3f6;
`

const BarPart = styled(animated.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  height: 6px;
  transform-origin: 0 0;
`

const RequiredSeparatorClip = styled.div`
  overflow: hidden;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`

const RequiredSeparatorWrapper = styled(animated.div)`
  height: 100%;
`

const RequiredSeparator = styled.div`
  height: 100%;
  border-left: 1px dashed #979797;
`

export default SummaryBar
