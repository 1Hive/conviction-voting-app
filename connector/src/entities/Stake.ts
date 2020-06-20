export interface StakeData {
  id: string
  entity: string
  amount: string
}

export default class Stake implements StakeData {
  readonly id!: string

  readonly entity!: string

  readonly amount!: string

  constructor(data: StakeData) {
    Object.assign(this, data)
  }
}
