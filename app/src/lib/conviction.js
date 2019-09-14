// const TIME_UNIT = 1
// const PADD = 10
// const CONV_ALPHA = 9 * PADD

const defaultBeta = 0.2 // maximum share of funds a proposal can take
const defaultRho = 0.5 * defaultBeta ** 2 // tuning param for the trigger function

// export function oldConvictionFormula(
//   timePassed,
//   lastConv,
//   oldAmount,
//   newAmount
// ) {
//   const steps = timePassed / TIME_UNIT
//   let conviction = lastConv
//   for (let i = 0; i < steps - 1; i++) {
//     conviction = (CONV_ALPHA * conviction) / PADD / 10 + oldAmount
//   }
//   conviction = (CONV_ALPHA * conviction) / PADD / 10 + newAmount
//   return conviction
// }

/**
 * Calculate conviction
 * @param {number} timePassed Number of blocks since last function piece
 * @param {number} lastConv Initial conviction in last function piece
 * @param {number} oldAmount Staked tokens in last function piece
 * @param {number} newAmount Currently staked tokens
 * @param {number} alpha Constant that controls the decay
 * @return {number} current conviction
 */
export function getConviction(
  timePassed,
  lastConv,
  oldAmount,
  newAmount,
  alpha
) {
  const t = timePassed
  const y0 = lastConv
  const x = oldAmount
  const a = alpha

  const y = y0 * a ** t + (x * (1 - a ** t)) / (1 - a)
  // i believe this should be
  // let y = y0 * a + x
  // as long as x is the current token amount at time t
  // t should not need to appear in this equation at all
  // const c = i => Math.floor(i);

  // Solidity code
  // const aD = c(a * D);
  // const Dt = c(D ** t);
  // const aDt = c(aD ** t);
  // const term1 = c(aDt * y0);
  // const term2 = c(x * D * c(Dt - aDt)) / c(D - aD);
  // const ySOL = c((term1 + term2) / Dt);
  // const diff = 100 * (y / ySOL - 1);

  return y
}

export function calcConviction(stakes) {
  const a = 90 / 100

  let lastConv = 0
  let currentConv = lastConv
  let oldAmount = 0
  const data = []

  let timePassed = 0 // age of current conviction amount - reset every time conviction stake is changed.
  let stakeIndex = 0

  for (let t = 0; t < 100; t++) {
    // get timeline events for this CV

    currentConv = getConviction(timePassed, lastConv, oldAmount, 0, a)

    data.push(currentConv)

    // check if user changed her conviction
    if (stakes.length > stakeIndex && stakes[stakeIndex].time <= t) {
      const action = stakes[stakeIndex]
      stakeIndex++
      oldAmount = action.tokensStaked
      timePassed = 0
      lastConv = currentConv

      console.log(
        `${action.entity} changes stake to ${action.tokensStaked} at ${t}`
      )
    }

    timePassed++
  }
  return data
}

export function getTreshold(
  requested,
  funds,
  supply,
  beta = defaultBeta,
  rho = defaultRho
) {
  const share = requested / funds
  if (share < beta) {
    return (rho * supply) / (beta - share) ** 2
  } else {
    return Number.POSITIVE_INFINITY
  }
}
