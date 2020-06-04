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

  const { proposals } = state
  return {
    ...state,

    proposals: proposals.map(({ stakes, ...proposal }) => ({
      ...proposal,
      stakes: stakes.map(({ amount, ...stake }) => ({
        ...stake,
        amount: new BN(amount),
      })),
    })),
  }
}
