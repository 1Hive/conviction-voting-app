// Fetches all the transaction data occurried in a contract from a specific block (including failed transactions)
// Usage: npx truffle exec script/data-dump.js --network <network> [--proxy <proxy-addr>] [--from-block <block>] [--to-block <block>] [--expanded true]

/* global web3  */

const PROXY_ARG = '--proxy'
const FROM_BLOCK_ARG = '--from-block'
const TO_BLOCK_ARG = '--to-block'

const WATCHED_CALLS = [
  'addProposal(string,bytes,uint256,address)',
  'cancelProposal(uint256)',
  'executeProposal(uint256)',
  'stakeAllToProposal(uint256)',
  'stakeToProposal(uint256,uint256)',
  'withdrawAllFromProposal(uint256)',
  'withdrawFromProposal(uint256,uint256)',
]

const EXCLUDE_PARAMS = ['addProposal(string,bytes,uint256,address)', 'Unknown']

const DEFAULT_PROXY = '0xe00b7b05c163e96923dfba4189c03b075a7d2849' // Conviction Voting Pilot
const DEFAULT_INIT_BLOCK = 10736632 // Conviction Voting Pilot

const argValue = (arg, defaultValue) =>
  process.argv.includes(arg)
    ? process.argv[process.argv.indexOf(arg) + 1]
    : defaultValue

const functionSignatures = WATCHED_CALLS.map(
  web3.eth.abi.encodeFunctionSignature
).reduce((accumulated, x, i) => ({ ...accumulated, [x]: i }), {})

module.exports = async callback => {
  console.log('txHash\tfrom\tgasUsed\tfunc\tparam1\tparam2')
  const currentBlock = await web3.eth.getBlockNumber()
  const proxy = argValue(PROXY_ARG, DEFAULT_PROXY)
  const fromBlock = parseInt(argValue(FROM_BLOCK_ARG, DEFAULT_INIT_BLOCK))
  const toBlock = parseInt(argValue(TO_BLOCK_ARG, currentBlock))

  const PAGE_SIZE = 10000
  let i = 0
  while (i <= parseInt((toBlock - fromBlock) / PAGE_SIZE)) {
    const pageFromBlock = fromBlock + i * PAGE_SIZE
    const pageToBlock = Math.min(fromBlock + (i + 1) * PAGE_SIZE - 1, toBlock)
    await web3.eth
      .getPastLogs({
        fromBlock: pageFromBlock,
        toBlock: pageToBlock,
        address: proxy,
      })
      .then(transactions => {
        return Promise.all(
          transactions.map(({ transactionHash }) =>
            Promise.all([
              web3.eth.getTransaction(transactionHash),
              web3.eth.getTransactionReceipt(transactionHash),
            ]).then(
              ([{ hash, from, value, input, gasPrice }, { gasUsed }]) => ({
                hash,
                from,
                value,
                input,
                gasPrice,
                gasUsed,
              })
            )
          )
        )
      })
      .then(transactions => {
        console.log(
          transactions
            .map(
              ({ hash, from, input, gasUsed, gasPrice }) =>
                `${hash}\t${from}\t${calcGas(
                  gasUsed,
                  gasPrice
                )}\t${decodeSignatureAndParameters(input)}`
            )
            .join('\n')
        )
      })
    i++
  }
  callback()
}

const calcGas = (gasUsed, gasPrice) => parseInt(gasUsed, 16) * gasPrice

const decodeSignature = data => {
  const signature = data.substring(0, 10)
  const index = functionSignatures[signature]
  return index !== undefined ? WATCHED_CALLS[index] : 'Unknown'
}

const decodeSignatureAndParameters = data => {
  try {
    const decodedSignature = decodeSignature(data)
    if (EXCLUDE_PARAMS.includes(decodedSignature)) {
      return decodedSignature
    }
    const param1 = web3.utils.hexToNumberString('0x' + data.substr(10, 64))
    const param2 = data.substr(10, 64)
      ? web3.utils.hexToNumberString('0x' + data.substr(74, 64))
      : ''
    return `"${decodedSignature}"\t${param1}\t${param2}`
  } catch (e) {
    console.error(e)
  }
  return ''
}
