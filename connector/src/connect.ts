import { createAppConnector } from '@aragon/connect-core'

import ConvictionVoting from './models/ConvictionVoting'
import ConvictionVotingConnectorTheGraph, {
  subgraphUrlFromChainId,
} from './thegraph/connector'

type Config = {
  subgraphUrl: string
}

export default createAppConnector<ConvictionVoting, Config>(
  ({ app, config, connector, network, verbose }) => {
    if (connector !== 'thegraph') {
      console.warn(
        `Connector unsupported: ${connector}. Using "thegraph" instead.`
      )
    }

    const subgraphUrl =
      config.subgraphUrl ?? subgraphUrlFromChainId(network.chainId)
    const convictionVotingConnector = new ConvictionVotingConnectorTheGraph(
      subgraphUrl,
      verbose
    )
    return new ConvictionVoting(convictionVotingConnector, app.address)
  }
)
