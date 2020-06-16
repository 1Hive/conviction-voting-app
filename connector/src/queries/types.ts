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

export type Proposal = {
  __typename?: 'Proposal'
  id: Scalars['ID']
  number: Scalars['Int']
  name: Scalars['String']
  link: Scalars['String']
  creator: Scalars['Bytes']
  beneficiary: Scalars['Bytes']
  requestedAmount: Scalars['String']
  executed: Scalars['Boolean']
  totalTokensStaked: Scalars['String']
}

export type StakeHistory = {
  __typename?: 'StakeHistory'
  id: Scalars['ID']
  entity: Scalars['Bytes']
  proposalId: Scalars['String']
  tokensStaked: Scalars['BigInt']
  totalTokensStaked: Scalars['BigInt']
  conviction: Scalars['BigInt']
  time: Scalars['String']
}
