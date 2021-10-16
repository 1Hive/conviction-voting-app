const {assert} = require('chai')

const ERROR_PREFIX = 'Returned error:'
const THROW_PREFIX = 'VM Exception while processing transaction: reverted with reason string'

async function assertThrows(
  blockOrPromise,
  expectedErrorCode,
  expectedReason,
  ctx
) {
  try {
    typeof blockOrPromise === 'function'
      ? await blockOrPromise()
      : await blockOrPromise
  } catch (error) {
    const errorMatchesExpected = error.message.search(expectedErrorCode) > -1
    assert(
      errorMatchesExpected,
      `Expected error code "${expectedErrorCode}" but failed with "${error}" instead.`
    )
    return error
  }
  // assert.fail() for some reason does not have its error string printed 🤷
  assert(
    false,
    `Expected "${expectedErrorCode}"${
      expectedReason ? ` (with reason: "${expectedReason}")` : ''
    } but it did not fail`
  )
}

async function assertJump(blockOrPromise, ctx) {
  await assertThrows(blockOrPromise, 'invalid JUMP', ctx)
}

async function assertInvalidOpcode(blockOrPromise, ctx) {
  await assertThrows(blockOrPromise, 'invalid opcode', ctx)
}

async function assertOutOfGas(blockOrPromise, ctx) {
  await assertThrows(blockOrPromise, 'out of gas', ctx)
}

async function assertRevert(blockOrPromise, expectedReason, ctx) {
  const error = await assertThrows(
    blockOrPromise,
    'revert',
    expectedReason,
    ctx
  )

  if (!expectedReason) {
    return
  }

  // Truffle v5 provides `error.reason`, but truffle v4 and buidler do not.
  if (!error.reason && error.message.includes(THROW_PREFIX)) {
    error.reason = error.message
      .replace(ERROR_PREFIX, '')
      .replace(THROW_PREFIX, '')
      .trim()
      .slice(1, -1)
  }

  // Truffle v5 sometimes adds an extra ' -- Reason given: reason.' to the error message 🤷
  error.reason = error.reason
    .replace(` -- Reason given: ${expectedReason}.`, '')
    .trim()

  assert.equal(
    error.reason,
    expectedReason,
    `Expected revert reason "${expectedReason}" but failed with "${
      error.reason || 'no reason'
    }" instead.`
  )
}

module.exports = {
  assertJump,
  assertInvalidOpcode,
  assertOutOfGas,
  assertRevert,
}
