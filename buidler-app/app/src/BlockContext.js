import React, { createContext, useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'

const BlockContext = createContext(0)
const { Provider, Consumer: BlockNumberConsumer } = BlockContext

function BlockNumberProvider({ children }) {
  const [blockNumber, setBlockNumber] = useState(0)
  const [refreshTime, setRefreshTime] = useState(1000)
  const { api, appState } = useAragonApi()

  // Pull block number on a certain interval
  useEffect(() => {
    const interval = setInterval(() => {
      api &&
        api
          .web3Eth('getBlockNumber')
          .toPromise()
          .then(blockNumber => {
            console.log('Block ' + blockNumber)
            setBlockNumber(blockNumber)
          })
    }, refreshTime)
    return () => clearInterval(interval)
  }, [api, refreshTime])

  // Increase interval when first block number received
  useEffect(() => {
    if (blockNumber > 0) setRefreshTime(10000)
  }, [api, blockNumber])

  // Also update block number according to appState (only after first number
  // received)
  useEffect(() => {
    if (
      blockNumber > 0 &&
      appState.convictionStakes &&
      appState.convictionStakes.length > 0
    ) {
      const lastStake = [...appState.convictionStakes].pop()
      if (lastStake.time > blockNumber) {
        setBlockNumber(lastStake.time)
      }
    }
  }, [appState])

  return <Provider value={blockNumber}>{children}</Provider>
}

const useBlockNumber = () => React.useContext(BlockContext)

export { BlockNumberProvider, BlockNumberConsumer, useBlockNumber }
