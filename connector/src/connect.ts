import { createAppConnector } from '@aragon/connect-core'

import ConvictionVoting from './models/ConvictionVoting'
import ConvictionVotingConnectorTheGraph, {
  subgraphUrlFromChainId,
} from './thegraph/connector'

type Config = {
  subgraphUrl: string
  pollInterval?: number
}

export default createAppConnector<ConvictionVoting, Config>(
  ({ app, config, connector, network, orgConnector, verbose }) => {
    if (connector !== 'thegraph') {
      console.warn(
        `Connector unsupported: ${connector}. Using "thegraph" instead.`
      )
    }

    const subgraphUrl =
      config.subgraphUrl ?? subgraphUrlFromChainId(network.chainId)

    let pollInterval
    if (orgConnector.name === 'thegraph') {
      pollInterval =
        config?.pollInterval ?? orgConnector.config?.pollInterval ?? undefined
    }

    const convictionVotingConnector = new ConvictionVotingConnectorTheGraph({
      pollInterval,
      subgraphUrl,
      verbose
    })

    return new ConvictionVoting(convictionVotingConnector, app.address)
  }
)
