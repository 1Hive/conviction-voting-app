import gql from 'graphql-tag'

export const ALL_PROPOSALS = (type: string) => gql`
  ${type} Proposals($appAddress: String!, $first: Int!, $skip: Int!) {
    proposals(where: {
      appAddress: $appAddress
    }, first: $first, skip: $skip) {
      number: string
      name: string
      link: string
      creator: string
      beneficiary: string
      requestedAmount: string
      executed: boolean
      totalTokensStaked: string
      stakes {
        entity
        amount
      }
    }
  }
`

export const STAKE_HISTORY = (type: string) => gql`
  ${type} StakeHistory($appAddress: String, $first: Int!, $skip: Int!) {
    stakeHistories(where : { appAddress: $appAddress }, first: $first, skip: $skip) {
      id
      entity
      proposalId
      tokensStaked
      totalTokensStaked
      time
      conviction
    }
  }
`
