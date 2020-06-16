import { QueryResult } from '@aragon/connect-thegraph'
import { StakeHistory as StakeGql } from '../queries/types'
import Stake, { StakeData } from '../entities/Stake'

export function parseStakes(result: QueryResult, connector: any): Stake[] {
  const stakes = result.data.stakeHistories

  if (!stakes) {
    throw new Error('Unable to parse stakes.')
  }

  const datas = stakes.map(
    (stake: StakeGql): StakeData => {
      return {
        id: stake.id,
        entity: stake.entity,
        proposalId: stake.proposalId,
        tokensStaked: stake.tokensStaked,
        totalTokensStaked: stake.totalTokensStaked,
        time: stake.time,
        conviction: stake.conviction,
      }
    }
  )

  return datas.map((data: StakeData) => {
    return new Stake(data, connector)
  })
}
