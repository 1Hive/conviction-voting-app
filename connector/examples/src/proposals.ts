import { connect } from '@aragon/connect'
import { ConvictionVoting, Proposal } from '../../src'

function proposalId(proposal: Proposal): string {
  return (
    '#' +
    String(parseInt(proposal.id.match(/proposalId:(.+)$/)?.[1] || '0')).padEnd(
      2,
      ' '
    )
  )
}

function describeProposal(proposal: Proposal) {
  console.log(`PROPOSAL ${proposalId(proposal)}`)
  console.log(`Name: ${proposal.name}`)
  console.log(`Link: ${proposal.link}`)
  console.log(`Requested amount: ${proposal.requestedAmount}`)
  console.log(`Beneficiary: ${proposal.beneficiary}`)
}

async function main() {
  const org = await connect(
    '0x8494952a4b27ba5ceb70da756af1179e16c27604',
    'thegraph',
    { chainId: 4 }
  )
  const apps = await org.apps()
  const convictionVotingApp = apps.find(
    app => app.appName === 'gardens-dependency.open.aragonpm.eth'
  )

  console.log('\nOrganization:', org.location, `(${org.address})`)

  if (!convictionVotingApp?.address) {
    console.log('\nNo conviction voting app found in this organization')
    return
  }

  console.log(`\nConviction voting app: ${convictionVotingApp.address}`)

  const conviction = new ConvictionVoting(
    convictionVotingApp.address,
    'https://api.thegraph.com/subgraphs/id/QmYTw3vwSqarPAoX3RisXckYBtaarteuv8e1tfSr72veEM'
  )

  const proposals = await conviction.proposals()

  proposals.map(describeProposal)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('')
    console.error(err)
    console.log(
      'Please report any problem to https://github.com/aragon/connect/issues'
    )
    process.exit(1)
  })
