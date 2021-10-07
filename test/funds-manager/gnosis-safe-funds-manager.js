const { assertRevert } = require('@aragon/contract-helpers-test/src/asserts/assertThrow')
const {ZERO_ADDRESS} = require("@aragon/contract-helpers-test");
const GnosisSafeFundsManager = artifacts.require('GnosisSafeFundsManager')
const Vault = artifacts.require('VaultMock')
const MiniMeToken = artifacts.require('MiniMeToken')

contract('GnosisSafeFundsManager', ([owner, newOwner, tokenReceiver]) => {

  let token, vault, aragonVaultFundsManager

  const VAULT_FUNDS = 1000

  beforeEach(async () => {
    vault = await Vault.new()
    aragonVaultFundsManager = await GnosisSafeFundsManager.new(vault.address)

    token = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'token', 18, 'TKN', true)
    await token.generateTokens(vault.address, VAULT_FUNDS)
  })

  describe.only("Contract tests", () => {

    it('sets correct constructor params', async () => {
      assert.equal(await aragonVaultFundsManager.owner(), owner, "Incorrect owner")
      assert.equal(await aragonVaultFundsManager.aragonVault(), vault.address, "Incorrect owner")
    })

    describe('setOwner()', () => {
      it('sets the owner', async () => {
        await aragonVaultFundsManager.setOwner(newOwner)
        assert.equal(await aragonVaultFundsManager.owner(), newOwner, "Incorrect owner")
      })

      it('reverts when not called by the owner', async () => {
        await assertRevert(aragonVaultFundsManager.setOwner(newOwner, {from: newOwner}), "ERR:NOT_OWNER")
      })
    })

    describe('balance()', () => {
      it('returns the correct balance', async () => {
        assert.equal(await aragonVaultFundsManager.balance(token.address), VAULT_FUNDS, "Incorrect balance")
      })
    })

    describe('transfer()', () => {
      it('transfers the funds', async () => {
        const transferAmount = 250

        await aragonVaultFundsManager.transfer(token.address, tokenReceiver, transferAmount)

        assert.equal(await token.balanceOf(tokenReceiver), transferAmount, "Incorrect token receiver balance")
        assert.equal(await token.balanceOf(vault.address), VAULT_FUNDS - transferAmount, "Incorrect vault balance")
      })

      it('reverts when not called by the owner', async () => {
        await assertRevert(aragonVaultFundsManager.transfer(token.address, tokenReceiver, 250, {from: tokenReceiver}), "ERR:NOT_OWNER")
      })
    })
  })
})
