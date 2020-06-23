import Entity from './ConvictionVotingEntity'
import ConvictionVotingConnector from '../connector'
import { TokenData } from './Token'

export interface ConfigData {
  id: string
  decay: string
  weight: string
  maxRatio: string
  pctBase: string
  stakeToken: TokenData
  requestToken: TokenData
}

export default class Config extends Entity implements ConfigData {
  id!: string

  decay!: string

  weight!: string

  maxRatio!: string

  pctBase!: string

  stakeToken!: TokenData

  requestToken!: TokenData

  constructor(data: ConfigData, connector: ConvictionVotingConnector) {
    super(connector)

    Object.assign(this, data)
  }
}
