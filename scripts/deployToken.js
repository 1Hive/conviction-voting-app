const ERC20Token = artifacts.require('ERC20Token')

const deployToken = async (name, symbol) => {
  return await ERC20Token.new(name, symbol)
}

module.exports = async callback => {
  try {
    const name = process.argv[3]
    const symbol = process.argv[4]

    const token = await deployToken(name, symbol)
    console.log(token.address)
    callback()
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}
