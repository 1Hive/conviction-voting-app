import { useMemo } from 'react'
import { useAppState, useConnectedAccount } from '@aragon/api-react'
import BN from 'bn.js'
import { addressesEqual } from '../lib/web3-utils'

export default function useAccountTotalStaked() {
  const { convictionStakes = [] } = useAppState()
  const connectedAccount = useConnectedAccount()

  const totalStaked = useMemo(() =>
    convictionStakes
      .filter(({ entity }) => addressesEqual(entity, connectedAccount))
      .reduce((acc, { tokensStakedBN }) => acc.add(tokensStakedBN), new BN(0))
  )

  return totalStaked
}
