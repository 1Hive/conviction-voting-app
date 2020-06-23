# The Graph Connector for Conviction Voting

## Usage

```js
const org = await connect(
  <org-address>,
  'thegraph',
  { chainId: <chain-id> }
)
const apps = await org.apps()
const convictionVotingApp = apps.find(
  app => app.appName === 'conviction-voting.open.aragonpm.eth'
)

const conviction = new ConvictionVoting(
  convictionVotingApp.address,
  <subgraph-url>
)

const proposals = await conviction.proposals()
```
