import { connect } from '@aragon/connect'
import { ConvictionVoting, Proposal } from '../../src'

const ORG_ADDRESS = '0x4084E59500eC40AA375cE8D783f3a9E1aBf80bd7'
const APP_ID = 'conviction-voting.open.aragonpm.eth'

function proposalId(proposal: Proposal): string {
  return (
    '#' +
    String(parseInt(proposal.id.match(/proposalId:(.+)$/)?.[1] || '0')).padEnd(
      2,
      ' '
    )
  )
}

async function describeProposal(proposal: Proposal): Promise<void> {
  console.log(`PROPOSAL ${proposalId(proposal)}`)
  console.log(`Name: ${proposal.name}`)
  console.log(`Link: ${proposal.link}`)
  console.log(`Requested amount: ${proposal.requestedAmount}`)
  console.log(`Beneficiary: ${proposal.beneficiary}`)
  console.log(`Stake history: `)
  const stakeHistory = await proposal.stakesHistory()
  console.log(stakeHistory)
}

async function main(): Promise<void> {
  const org = await connect(ORG_ADDRESS, 'thegraph', { chainId: 4 })
  const apps = await org.apps()
  const convictionVotingApp = apps.find(app => app.appName === APP_ID)

  console.log('\nOrganization:', org.location, `(${org.address})`)

  if (!convictionVotingApp?.address) {
    console.log('\nNo conviction voting app found in this organization')
    return
  }

  console.log(`\nConviction voting app: ${convictionVotingApp.address}`)

  const conviction = new ConvictionVoting(
    convictionVotingApp.address,
    'https://api.thegraph.com/subgraphs/name/1hive/aragon-cv-rinkeby-staging'
  )

  console.log(`\nProposals:`)
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
