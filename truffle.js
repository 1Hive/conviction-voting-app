const truffle = require('@aragon/truffle-config-v5')

truffle.networks.rinkeby.gasPrice = 20000000001
truffle.networks.rpc.network_id = '*'

module.exports = truffle