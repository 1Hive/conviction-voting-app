import { QueryResult } from '@aragon/connect-thegraph'
import StakeHistory from '../../models/StakeHistory'
import { StakeHistoryData } from '../../types'

export function parseStakes(
  result: QueryResult,
  connector: any
): StakeHistory[] {
  const stakes = result.data.stakeHistories

  if (!stakes) {
    throw new Error('Unable to parse stakes.')
  }

  const datas = stakes.map((stake: StakeHistoryData) => {
    return {
      id: stake.id,
      entity: stake.entity,
      proposalId: stake.proposalId,
      tokensStaked: stake.tokensStaked,
      totalTokensStaked: stake.totalTokensStaked,
      time: stake.time,
      conviction: stake.conviction,
    }
  })

  return datas.map((data: StakeHistoryData) => {
    return new StakeHistory(data, connector)
  })
}
