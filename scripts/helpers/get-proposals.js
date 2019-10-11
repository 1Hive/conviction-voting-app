const getAccounts = require('./get-accounts')

module.exports = async web3 => {
  const [account0, account1] = await getAccounts(web3)
  return [
    ['Aragon Sidechain', '0x0', 2000 * 10 ** 18, account1],
    ['Conviction Voting', '0x0', 1000 * 10 ** 18, account0],
    ['Aragon Button', '0x0', 1000 * 10 ** 18, account0],
  ]
}
