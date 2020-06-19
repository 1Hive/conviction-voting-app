import gql from 'graphql-tag'

export const ALL_PROPOSALS = (type: string) => gql`
  ${type} Proposals($appAddress: String!, $first: Int!, $skip: Int!) {
    proposals(where: {
      appAddress: $appAddress
    }, first: $first, skip: $skip) {
      id
      number
      name
      link
      creator
      beneficiary
      requestedAmount
      executed
      totalTokensStaked
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
