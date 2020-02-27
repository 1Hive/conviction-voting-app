import React from 'react'
import styled from 'styled-components'
import { theme, useTheme, GU, Text } from '@aragon/ui'
import { formatTokenAmount } from '../lib/utils'

const splitAmount = amount => {
  const [integer, fractional] = formatTokenAmount(amount).split('.')
  return (
    <span>
      <span className="integer">{integer}</span>
      {fractional && <span className="fractional">.{fractional}</span>}
    </span>
  )
}

const BalanceToken = ({ amount, symbol, verified, convertedAmount = -1 }) => (
  <Wrap>
    <div>
      <Text color={useTheme().surfaceContent.toString()}>
        {splitAmount(amount.toFixed(3))}{' '}
      </Text>
      <Text color={useTheme().surfaceContent.toString()}>{symbol || '?'}</Text>
    </div>
    <ConvertedAmount>
      {convertedAmount >= 0
        ? `(${formatTokenAmount(convertedAmount.toFixed(2))})`
        : '(−)'}
    </ConvertedAmount>
  </Wrap>
)

const Wrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`

const ConvertedAmount = styled.div`
  color: ${theme.textTertiary};
`

export default BalanceToken
