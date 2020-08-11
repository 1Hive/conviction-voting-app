const truffle = require('@aragon/truffle-config-v5')

truffle.compilers.solc.settings.optimizer.runs = 1000
// truffle.compilers.solc.settings.optimizer.runs = process.env.TRUFFLE_TEST ? 1000 : 10000

truffle.networks.rinkeby.gasPrice = 20000000001

truffle.networks.rpc.gas = 10e6
truffle.networks.rinkeby.gas = 10e6

truffle.networks.rpc.network_id = '*'

module.exports = truffle