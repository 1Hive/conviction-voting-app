import gql from 'graphql-tag'

export const CONFIG = (type: string) => gql`
  ${type} Config($appAddress: String!) {
    config(where: {
      appAddress: $appAddress
    }) {
      id
      decay
      weight
      maxRatio
      pctBase
      stakeToken {
        name
        symbol
        decimals
      }
      requestToken {
        name
        symbol
        decimals
      }
    }
  }
`

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
      appAddress
    }
  }
`

export const STAKE_HISTORY = (type: string) => gql`
  ${type} StakeHistory($appAddress: String, $proposalId: String, $first: Int!, $skip: Int!) {
    stakeHistories(where : { appAddress: $appAddress, proposalId: $proposalId }, first: $first, skip: $skip) {
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
