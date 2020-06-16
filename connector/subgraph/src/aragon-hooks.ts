import { Address } from '@graphprotocol/graph-ts'
import { loadAppConfig } from './helpers'

/*
 * Called when an app proxy is detected.
 *
 * Return the name of a data source template if you would like to create it for a given appId.
 * Return null otherwise.
 *
 * The returned name is used to instantiate a template declared in the subgraph manifest file,
 * which must have the same name.
 */
export function getTemplateForApp(appId: string): string | null {
  if (
    appId ===
    '0x16c0b0af27b5e169e5f678055840d7ab2b312519d7700a06554c287619f4b9f9'
  ) {
    return 'ConvictionVoting'
  } else {
    return null
  }
}

export function onOrgTemplateCreated(orgAddress: Address): void {}
export function onAppTemplateCreated(appAddress: Address, appId: string): void {
  loadAppConfig(appAddress)
}
export function onTokenTemplateCreated(tokenAddress: Address): void {}
