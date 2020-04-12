import React, { useState, useEffect, useRef } from 'react'
import BalanceToken from './BalanceToken'
import { round } from '../lib/math-utils'

const CONVERT_API_BASE = 'https://min-api.cryptocompare.com/data'
const CONVERT_THROTTLE_TIME = 5000

const convertApiUrl = symbols =>
  `${CONVERT_API_BASE}/price?fsym=USD&tsyms=${symbols.join(',')}`

function Balance(props) {
  const { amount = 0, decimals, symbol, icon, verified, color, size } = props
  const [convertRates, setConvertRates] = useState({})

  const updateConvertedRates = async ({ verified, symbol }) => {
    if (!verified) {
      return
    }

    const res = await fetch(convertApiUrl([symbol]))
    const convertRates = await res.json()
    setConvertRates(convertRates)
  }

  useThrottledEffect(
    () => {
      updateConvertedRates(props)
    },
    CONVERT_THROTTLE_TIME,
    [verified, symbol]
  )

  const adjustedAmount = amount / Math.pow(10, decimals)
  const convertedAmount =
    verified && convertRates[symbol]
      ? adjustedAmount / convertRates[symbol]
      : -1
  return (
    <section>
      <BalanceToken
        amount={round(parseFloat(adjustedAmount), 5)}
        convertedAmount={round(parseFloat(convertedAmount), 5)}
        symbol={symbol}
        verified={verified}
        color={color}
        size={size}
        icon={icon}
      />
    </section>
  )
}

const useThrottledEffect = (callback, delay, deps = []) => {
  const lastRan = useRef(Date.now())

  useEffect(() => {
    const handler = setTimeout(function() {
      if (Date.now() - lastRan.current >= delay) {
        callback()
        lastRan.current = Date.now()
      }
    }, delay - (Date.now() - lastRan.current))

    return () => clearTimeout(handler)
  }, [delay, ...deps])
}

export default Balance
