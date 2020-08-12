import gql from 'graphql-tag'

export const CONFIG = (type: string) => gql`
  ${type} Config($id: String!) {
    config(id: $id) {
      id
      decay
      weight
      maxRatio
      pctBase
      stakeToken {
        id
        name
        symbol
        decimals
      }
      requestToken {
        id
        name
        symbol
        decimals
      }
      maxStakedProposals
      minThresholdStakePercentage
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
      status
      totalTokensStaked
      stakes {
        entity
        amount
      }
      appAddress
    }
  }
`

export const STAKE_HISTORY_BY_PROPOSAL = (type: string) => gql`
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

export const ALL_STAKE_HISTORY = (type: string) => gql`
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
