import { connect } from '@aragon/connect'
import connectConviction, { Proposal } from '@1hive/connect-conviction-voting'

const ORG_ADDRESS = '0xe9869a0bbc8fb8c61b7d81c33fa2ba84871b3b0e'

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
  console.log(`Stakses length: ${proposal.stakes.length}`)
  const stakeHistory = await proposal.stakesHistory()
  console.log(stakeHistory)
}

async function main(): Promise<void> {
  const org = await connect(ORG_ADDRESS, 'thegraph', { network: 100 })

  const convictionapp = await org.app('conviction-beta')

  const conviction = await connectConviction(convictionapp)

  console.log('\nOrganization:', org.location, `(${org.address})`)

  if (!conviction?.address) {
    console.log('\nNo conviction voting app found in this organization')
    return
  }

  console.log(`\nConviction voting app: ${conviction.address}`)

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
