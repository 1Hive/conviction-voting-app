import React, { createContext, useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'

const BlockContext = createContext(0)
const { Provider, Consumer: BlockNumberConsumer } = BlockContext

function BlockNumberProvider({ children }) {
  const [blockNumber, setBlockNumber] = useState(0)
  const [refreshTime, setRefreshTime] = useState(1000)
  const { api } = useAragonApi()

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

  useEffect(() => {
    if (blockNumber > 0) setRefreshTime(10000)
  }, [api, blockNumber])

  return <Provider value={blockNumber}>{children}</Provider>
}

const useBlockNumber = () => React.useContext(BlockContext)

export { BlockNumberProvider, BlockNumberConsumer, useBlockNumber }
