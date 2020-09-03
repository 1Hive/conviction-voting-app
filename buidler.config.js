const {usePlugin} = require('@nomiclabs/buidler/config')

usePlugin('@nomiclabs/buidler-truffle5')
usePlugin('buidler-gas-reporter')

module.exports = {
    defaultNetwork: 'localhost',
    networks: {
        buidlerevm: {
        },
        localhost: {
            url: 'http://localhost:8545',
            accounts: {
                mnemonic: "explain tackle mirror kit van hammer degree position ginger unfair soup bonus"
            }
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
