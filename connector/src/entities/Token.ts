export interface TokenData {
  id: string
  name: string
  symbol: string
  decimals: number
}

export default class Token implements TokenData {
  readonly id!: string

  readonly name!: string

  readonly symbol!: string

  readonly decimals!: number

  constructor(data: TokenData) {
    Object.assign(this, data)
  }
}
