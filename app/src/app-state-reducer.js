import BigNumber from './lib/bigNumber'

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

  const {
    proposals,
    stakeToken,
    globalParams,
    requestToken,
    convictionStakes,
  } = state

  const pctBaseBN = new BigNumber(globalParams.pctBase)

  return {
    ...state,
    globalParams: {
      alpha: new BigNumber(globalParams.decay).div(pctBaseBN),
      maxRatio: new BigNumber(globalParams.maxRatio).div(pctBaseBN),
      weight: new BigNumber(globalParams.weight).div(pctBaseBN),
    },
    stakeToken: {
      ...stakeToken,
      tokenDecimals: parseInt(stakeToken.tokenDecimals),
      balance: new BigNumber(stakeToken.balance),
      totalSupply: new BigNumber(stakeToken.tokenSupply),
    },
    requestToken: {
      ...requestToken,
      amount: new BigNumber(requestToken.amount),
    },

    proposals: proposals.map(({ stakes, ...proposal }) => ({
      ...proposal,
      requestedAmount: new BigNumber(proposal.requestedAmount),
      stakes: stakes.map(({ amount, ...stake }) => ({
        ...stake,
        amount: new BigNumber(amount),
      })),
    })),
    convictionStakes: convictionStakes.map(convictionStake => ({
      ...convictionStake,
      tokensStaked: BigNumber(convictionStake.tokensStaked),
      totalTokensStaked: BigNumber(convictionStake.totalTokensStaked),
      conviction: BigNumber(convictionStake.conviction),
    })),
  }
}
