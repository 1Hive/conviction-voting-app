const advanceTimeAndBlock = async time => {
  await advanceTime(time)
  await advanceBlock()

  return Promise.resolve(web3.eth.getBlock('latest'))
}

const advanceTimeAndBlocksBy = async (time, numOfBlocks) => {
  await advanceTime(time)
  while (numOfBlocks !== 0) {
    await advanceBlock()
    numOfBlocks--
  }
  return Promise.resolve(web3.eth.getBlock('latest'))
}

const advanceTime = time => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync(
      {
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [time],
        id: new Date().getTime(),
      },
      (err, result) => {
        if (err) {
          return reject(err)
        }
        return resolve(result)
      }
    )
  })
}

const advanceBlock = () => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync(
      {
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: new Date().getTime(),
      },
      (err, result) => {
        if (err) {
          return reject(err)
        }
        const newBlockHash = web3.eth.getBlock('latest').hash
        return resolve(newBlockHash)
      }
    )
  })
}

module.exports = {
  advanceTimeAndBlocksBy,
  advanceTimeAndBlock,
}
