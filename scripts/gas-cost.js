// Fetches the gas cost of all transactions occurried in a contract from a specific block (including failed transactions)
// Usage: npx truffle exec script/return-gas.js --network <network> [--proxy <proxy-addr>] [--from-block <block>] [--expanded true]

/* global web3  */
const PROXY_ARG = '--proxy'
const FROM_BLOCK_ARG = '--from-block'
const EXPANDED_ARG = '--expanded'

const argValue = (arg, defaultValue) =>
  process.argv.includes(arg)
    ? process.argv[process.argv.indexOf(arg) + 1]
    : defaultValue

const proxy = argValue(PROXY_ARG, '0x79cfc6e211d506300eb109c7af8f3e03a6565616')
const fromBlock = argValue(FROM_BLOCK_ARG, 7013334)
const expanded = argValue(EXPANDED_ARG, false)

module.exports = async callback => {
  web3.eth
    .getPastLogs({
      fromBlock,
      address: proxy,
    })
    .then(transactions => {
      console.log(`> Processing ${transactions.length} transactions…`)
      return Promise.all(
        transactions.map(({ transactionHash }) =>
          web3.eth.getTransactionReceipt(transactionHash)
        )
      )
    })
    .then(transactions => {
      console.log(`> Gas spent from block ${fromBlock} until now (in gwei):`)
      if (expanded) {
        console.log(
          transactions
            .map(
              ({ transactionHash, from, gasUsed }) =>
                `${transactionHash}, ${from}, ${parseInt(gasUsed, 16)}`
            )
            .join('\n')
        )
      } else {
        console.log(
          Object.entries(
            transactions.reduce(
              (dict, { from, gasUsed }) => ({
                ...dict,
                [from]: (dict[from] || 0) + parseInt(gasUsed, 16),
              }),
              {}
            )
          )
            .map(([from, gas]) => `${from}, ${gas}`)
            .join('\n')
        )
      }
      callback()
    })
}
