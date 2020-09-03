const {usePlugin} = require('@nomiclabs/buidler/config')

usePlugin('@nomiclabs/buidler-truffle5')
// usePlugin('buidler-gas-reporter') // Must have a ganache instance running but execute with buidlerevm, otherwise errors occur

module.exports = {
    defaultNetwork: 'buidlerevm',
    networks: {
        buidlerevm: {
        },
        ganache: {
            url: 'http://localhost:8545'
        }
    },
    solc: {
        version: '0.4.24',
        optimizer: {
            enabled: true,
            runs: 1000
        },
    }
}
