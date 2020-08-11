const { getInstalledApp } = require('@aragon/contract-helpers-test/src/aragon-os')
const { hash } = require('eth-ens-namehash')

module.exports = async (artifacts, options = {}) => {
  let { vaultBase, hookedTmBase, vault, hookedTm, dao, acl, owner } = options
  const Vault = artifacts.require('Vault')
  const HookedTokenManager = artifacts.require('HookedTokenManager')

  if (vault && hookedTm) {
    return options
  }

  if (!vaultBase) {
    console.log(`Deploying Vault Base...`)
    vaultBase = await Vault.new()
    console.log(`Vault Base: ${ vaultBase.address }`)
  }

  if (!hookedTmBase) {
    console.log(`Deploying HookedTokenManager Base...`)
    hookedTmBase = await HookedTokenManager.new()
    console.log(`HookedTokenManager Base: ${ hookedTmBase.address }`)
  }

  if (!vault) {
    console.log(`Installing Vault...`)
    const vaultAppId = hash(`vault.open.aragonpm.eth`)
    const receipt = await dao.newAppInstance(vaultAppId, vaultBase.address, '0x', false, { from: owner })
    vault = await vaultBase.constructor.at(getInstalledApp(receipt, vaultAppId))
    console.log(`Vault Proxy: ${ vault.address }`)
  }

  if (!hookedTm) {
    console.log(`Installing HookedTokenManager...`)
    const hookedTokenManagerAppId = hash(`hooked-token-manager.open.aragonpm.eth`)
    const receipt = await dao.newAppInstance(hookedTokenManagerAppId, hookedTmBase.address, '0x', false, { from: owner })
    hookedTm = await hookedTmBase.constructor.at(getInstalledApp(receipt, hookedTokenManagerAppId))
    console.log(`HookedTokenManager Proxy: ${ hookedTm.address }`)
  }

  return { ...options, vaultBase, hookedTmBase, vault, hookedTm }
}