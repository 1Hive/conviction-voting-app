import { QueryResult } from '@aragon/connect-thegraph'
import Config from '../../models/Config'
import { ConfigData } from '../../types'

export function parseConfig(result: QueryResult, connector: any): Config {
  const configs = result.data.configs

  if (!configs) {
    throw new Error('Unable to parse config.')
  }

  return configs.map((config: ConfigData) => {
    return new Config(config, connector)
  })
}
