import BN from 'bn.js'
import BigNumber from 'bignumber.js'

export default function reducer(state) {
  if (state === null) {
    return {
      globalParams: {},
      stakeToken: {},
      requestToken: {},
      proposals: [],
      convictionStakes: [],
      isSyncing: true,
    }
  }

  const { proposals, stakeToken, globalParams, requestToken } = state

  console.log('globalParams ', globalParams)
  const pctBaseBN = new BigNumber(globalParams.pctBase.toString())
  console.log('pctBaseBN ', pctBaseBN)

  const test = new BigNumber(globalParams.decay.toString()).div(pctBaseBN)

  console.log('test!!! ', test.toNumber())

  return {
    ...state,
    globalParams: {
      alpha: parseInt(globalParams.decay) / globalParams.pctBase,
      maxRatio: parseInt(globalParams.maxRatio) / globalParams.pctBase,
      weight: parseInt(globalParams.weight) / globalParams.pctBase,

      alphaBN: new BigNumber(globalParams.decay.toString()).div(pctBaseBN),
      maxRatioBN: new BigNumber(globalParams.maxRatio.toString()).div(
        pctBaseBN
      ),
      weightBN: new BigNumber(globalParams.weight.toString()).div(pctBaseBN),
    },
    stakeToken: {
      ...stakeToken,
      tokenDecimals: parseInt(stakeToken.tokenDecimals),
      balanceBN: new BN(stakeToken.balance),
      totalSupplyBN: new BN(stakeToken.tokenSupply),
      totalSupplyBNN: new BigNumber(stakeToken.tokenSupply.toString()),
    },
    requestToken: {
      ...requestToken,
      amountBN: new BigNumber(requestToken.amount.toString()),
    },

    proposals: proposals.map(({ stakes, ...proposal }) => ({
      ...proposal,
      requestedAmountBN: new BigNumber(proposal.requestedAmountBN.toString()),
      stakes: stakes.map(({ amount, ...stake }) => ({
        ...stake,
        amount: new BN(amount),
      })),
    })),
  }
}
