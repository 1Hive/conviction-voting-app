import React from 'react'
import styled from 'styled-components'

import { useNetwork } from '@aragon/api-react'
import { theme, useLayout, tokenIconUrl, GU } from '@aragon/ui'

import { formatTokenAmount } from '../lib/token-utils'
import { ETHER_TOKEN_VERIFIED_BY_SYMBOL } from '../lib/verified-tokens'

const splitAmount = amount => {
  const [integer, fractional] = formatTokenAmount(amount).split('.')
  return (
    <span>
      <span className="integer">{integer}</span>
      {fractional && <span className="fractional">.{fractional}</span>}
    </span>
  )
}

const BalanceToken = ({
  amount,
  symbol,
  verified,
  convertedAmount = -1,
  color,
  size,
}) => {
  const { layoutName } = useLayout()
  const compactMode = layoutName === 'small'
  const network = useNetwork()
  const tokenAddress =
    symbol && ETHER_TOKEN_VERIFIED_BY_SYMBOL.get(symbol.toUpperCase())
  return (
    <Wrap compactMode={compactMode}>
      <div
        css={`
          color: ${color};
          ${size}
        `}
      >
        {tokenAddress && (
          <TokenIcon
            src={tokenIconUrl(tokenAddress, symbol, network && network.type)}
          />
        )}
        {amount !== undefined ? splitAmount(amount.toFixed(3)) : ' - '}{' '}
        {symbol || ''}
      </div>
      <ConvertedAmount>
        {convertedAmount >= 0
          ? `($${formatTokenAmount(convertedAmount.toFixed(2))})`
          : '(−)'}
      </ConvertedAmount>
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  align-items: 'flex-start';
  justify-content: center;
  flex-direction: column;
`

const ConvertedAmount = styled.div`
  color: ${theme.textTertiary};
`
const TokenIcon = styled.img.attrs({ alt: '', width: '16', height: '16' })`
  position: relative;
  top: 2px;
  margin-right: ${1 * GU}px;
`

export default BalanceToken
