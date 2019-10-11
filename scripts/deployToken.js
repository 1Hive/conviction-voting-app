/* global artifacts */
const ERC20Token = artifacts.require('ERC20Token')

const deployToken = (name, symbol, decimals) => {
  return ERC20Token.new(name, symbol, decimals)
}

module.exports = async callback => {
  try {
    const [name, symbol, decimals] = process.argv.slice(4)

    const token = await deployToken(name, symbol, decimals)
    console.log(token.address)
    callback()
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}
