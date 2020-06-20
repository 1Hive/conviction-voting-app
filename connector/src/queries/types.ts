// Generated with https://graphql-code-generator.com/#live-demo

// 1. Get schema from subgraph
// 2. Paste in generator (https://graphql-code-generator.com/#live-demo)
// 3. Add on top:
/*
    directive @entity on OBJECT
    directive @derivedFrom(field: String) on FIELD_DEFINITION
    scalar BigInt
    scalar Bytes
*/
// 4. Generate and paste output here

export type Maybe<T> = T | null
export type Exact<T extends { [key: string]: any }> = { [K in keyof T]: T[K] }
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string
  String: string
  Boolean: boolean
  Int: number
  Float: number
  BigInt: any
  Bytes: any
}

export type Config = {
  __typename?: 'Config'
  id: Scalars['ID']
  decay: Scalars['BigInt']
  weight: Scalars['BigInt']
  maxRatio: Scalars['BigInt']
  pctBase: Scalars['BigInt']
  stakeToken: Token
  requestToken: Token
}

export type Proposal = {
  __typename?: 'Proposal'
  id: Scalars['ID']
  number: Scalars['BigInt']
  name: Scalars['String']
  link?: Maybe<Scalars['String']>
  creator: Scalars['Bytes']
  stakes: Array<Stake>
  beneficiary?: Maybe<Scalars['Bytes']>
  requestedAmount?: Maybe<Scalars['BigInt']>
  executed: Scalars['Boolean']
  totalTokensStaked: Scalars['BigInt']
  appAddress: Scalars['Bytes']
}

export type Stake = {
  __typename?: 'Stake'
  id: Scalars['ID']
  entity: Scalars['Bytes']
  amount: Scalars['BigInt']
}

export type StakeHistory = {
  __typename?: 'StakeHistory'
  id: Scalars['ID']
  entity: Scalars['Bytes']
  proposalId: Scalars['String']
  tokensStaked: Scalars['BigInt']
  totalTokensStaked: Scalars['BigInt']
  time: Scalars['BigInt']
  conviction: Scalars['BigInt']
}

export type Token = {
  __typename?: 'Token'
  id: Scalars['ID']
  name: Scalars['String']
  symbol: Scalars['String']
  decimals: Scalars['Int']
}

export type AragonInfo = {
  __typename?: 'AragonInfo'
  id: Scalars['ID']
  orgs: Array<Scalars['Bytes']>
  apps: Array<Scalars['Bytes']>
  tokens: Array<Scalars['Bytes']>
}
