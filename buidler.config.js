const {usePlugin} = require('@nomiclabs/buidler/config')

usePlugin('@aragon/buidler-aragon')
usePlugin('@nomiclabs/buidler-etherscan')
usePlugin('@nomiclabs/buidler-truffle5')
// usePlugin('buidler-gas-reporter') // Must have a ganache instance running but execute with buidlerevm, otherwise errors occur

module.exports = {
    defaultNetwork: 'buidlerevm',
    networks: {
        buidlerevm: {
        },
        ganache: {
            url: 'http://localhost:8545'
        },
        rinkeby: {
            url: 'https://rinkeby.eth.aragon.network',
            accounts: [process.env.ETH_KEY],
            gas: 7.9e6,
            gasPrice: 15000000001
        },
        xdai: {
            url: 'https://dai.poa.network',
            accounts: [process.env.ETH_KEY],
            gas: 12e6,
            gasPrice: 1000000000
        },
    },
    solc: {
        version: '0.4.24',
        optimizer: {
            enabled: true,
            runs: 1 // Increase to 10000 for deployment to xDai (no byte code limit on xdai)
        },
    }
}
