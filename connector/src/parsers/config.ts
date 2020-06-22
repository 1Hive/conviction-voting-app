import { QueryResult } from '@aragon/connect-thegraph'
import { Config as ConfigGql } from '../queries/types'
import Config, { ConfigData } from '../entities/Config'

export function parseConfig(result: QueryResult, connector: any): Config {
  const config: ConfigGql = result.data.config

  if (!config) {
    throw new Error('Unable to parse config.')
  }

  const data: ConfigData = config

  return new Config(data, connector)
}
