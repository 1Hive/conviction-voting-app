const { assertRevert } = require('@aragon/contract-helpers-test/src/asserts/assertThrow')
const {ZERO_ADDRESS} = require("@aragon/contract-helpers-test");
const GnosisSafeFundsManager = artifacts.require('GnosisSafeFundsManager')
const GnosisSafe = artifacts.require('GnosisSafeMock')
const MiniMeToken = artifacts.require('MiniMeToken')

contract('GnosisSafeFundsManager', ([owner, newOwner, tokenReceiver]) => {

  let token, gnosisSafe, gnosisSafeFundsManager

  const GNOSIS_SAFE_FUNDS = 1000

  beforeEach(async () => {
    gnosisSafe = await GnosisSafe.new()
    gnosisSafeFundsManager = await GnosisSafeFundsManager.new(gnosisSafe.address)

    token = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'token', 18, 'TKN', true)
    await token.generateTokens(gnosisSafe.address, GNOSIS_SAFE_FUNDS)
  })

  describe("Contract tests", () => {

    it('sets correct constructor params', async () => {
      assert.equal(await gnosisSafeFundsManager.owner(), owner, "Incorrect owner")
      assert.equal(await gnosisSafeFundsManager.gnosisSafe(), gnosisSafe.address, "Incorrect owner")
    })

    describe('setOwner()', () => {
      it('sets the owner', async () => {
        await gnosisSafeFundsManager.setOwner(newOwner)
        assert.equal(await gnosisSafeFundsManager.owner(), newOwner, "Incorrect owner")
      })

      it('reverts when not called by the owner', async () => {
        await assertRevert(gnosisSafeFundsManager.setOwner(newOwner, {from: newOwner}), "ERR:NOT_OWNER")
      })
    })

    describe('balance()', () => {
      it('returns the correct balance', async () => {
        assert.equal(await gnosisSafeFundsManager.balance(token.address), GNOSIS_SAFE_FUNDS, "Incorrect balance")
      })
    })

    describe('transfer()', () => {
      it('transfers the funds', async () => {
        const transferAmount = 250

        await gnosisSafeFundsManager.transfer(token.address, tokenReceiver, transferAmount)

        assert.equal(await token.balanceOf(tokenReceiver), transferAmount, "Incorrect token receiver balance")
        assert.equal(await token.balanceOf(gnosisSafe.address), GNOSIS_SAFE_FUNDS - transferAmount, "Incorrect gnosisSafe balance")
        assert.equal(await gnosisSafe.operationPassed(), 0, "Incorrect operation")
      })

      it('reverts when token transfer returns false', async () => {
        await assertRevert(gnosisSafeFundsManager.transfer(token.address, tokenReceiver, GNOSIS_SAFE_FUNDS + 1), "ERR:TRANSFER_NOT_RETURN_TRUE")
      })

      it('reverts when token transfer reverts', async () => {
        await assertRevert(gnosisSafeFundsManager.transfer(token.address, ZERO_ADDRESS, GNOSIS_SAFE_FUNDS), "ERR:TRANSFER_REVERTED")
      })

      it('reverts when not called by the owner', async () => {
        await assertRevert(gnosisSafeFundsManager.transfer(token.address, tokenReceiver, 250, {from: tokenReceiver}), "ERR:NOT_OWNER")
      })
    })
  })
})
