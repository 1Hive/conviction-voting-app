import { QueryResult } from '@aragon/connect-thegraph'
import Config from '../../models/Config'
import { ConfigData } from '../../types'

export function parseConfig(result: QueryResult, connector: any): Config {
  const config = result.data.config

  if (!config) {
    throw new Error('Unable to parse config.')
  }

  const data: ConfigData = config

  return new Config(data, connector)
}
