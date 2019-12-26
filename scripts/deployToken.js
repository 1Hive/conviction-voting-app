/* global artifacts */
const ERC20Mock = artifacts.require('ERC20Mock')

const deployToken = (name, symbol, decimals) => {
  return ERC20Mock.new(name, symbol, decimals, 100000)
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
