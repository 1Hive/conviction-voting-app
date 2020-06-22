import { useState } from 'react'
import { useApi } from '@aragon/api-react'

import useInterval from './useInterval'
import { loadLatestBlock } from '../lib/web3-utils'

export function useLatestBlock(updateEvery = 1000) {
  const api = useApi()
  const [block, setBlock] = useState({ number: 0, timeStamp: 0 })

  useInterval(
    async () => {
      const { number, timestamp } = api ? await loadLatestBlock(api) : block
      // Prevent unnecessary re-renders
      if (number !== block.number) setBlock({ number, timestamp })
    },
    updateEvery,
    true
  )

  return block
}
