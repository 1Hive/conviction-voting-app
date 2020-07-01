const truffle = require('@aragon/truffle-config-v5')

// Tests need to compile the Agreements contract which requires a lower optimizer runs setting
truffle.compilers.solc.settings.optimizer.runs = process.env.TRUFFLE_TEST ? 1000 : 10000

truffle.networks.rinkeby.gasPrice = 20000000001
truffle.networks.rpc.network_id = '*'

module.exports = truffle