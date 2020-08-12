import { TokenData } from '../types'

export default class Token {
  readonly id: string
  readonly name: string
  readonly symbol: string
  readonly decimals: number

  constructor(data: TokenData) {
    this.id = data.id
    this.name = data.name
    this.symbol = data.symbol
    this.decimals = data.decimals
  }
}
