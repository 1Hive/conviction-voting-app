# The Graph Connector for Conviction Voting

## Usage

```js
  const org = await connect(ORG_ADDRESS, 'thegraph', { network: 4 })

  const convictionapp = await org.app('conviction-beta')

  const conviction = await connectConviction(convictionapp)

const proposals = await conviction.proposals()
```


### If you would like to use a coustom subgraph

```js
  const conviction = await connectConviction(convictionapp, [ 'thegraph', { subgraphUrl: <subgraph-url> } ])
```
