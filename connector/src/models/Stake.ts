import { StakeData } from '../types'

export default class Stake implements StakeData {
  readonly id: string
  readonly entity: string
  readonly amount: string

  constructor(data: StakeData) {
    this.id = data.id
    this.entity = data.entity
    this.amount = data.amount
  }
}
