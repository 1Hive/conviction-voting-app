import { QueryResult } from '@aragon/connect-thegraph'
import Config from '../../models/Config'

export function parseConfig(
  result: QueryResult,
  connector: any
): Config | null {
  const configs = result.data.configs

  if (!configs) {
    throw new Error('Unable to parse config.')
  }

  return configs[0] ? new Config(configs[0], connector) : null
}
