import BN from 'bn.js'

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

  const { proposals, stakeToken } = state
  return {
    ...state,

    stakeToken: {
      ...stakeToken,
      tokenDecimals: parseInt(stakeToken.tokenDecimals),
      balanceBN: new BN(stakeToken.balance),
      totalSupplyBN: new BN(stakeToken.totalSupply),
    },

    proposals: proposals.map(({ stakes, ...proposal }) => ({
      ...proposal,
      stakes: stakes.map(({ amount, ...stake }) => ({
        ...stake,
        amount: new BN(amount),
      })),
    })),
  }
}
