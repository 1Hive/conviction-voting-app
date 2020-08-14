import { Address, log } from '@graphprotocol/graph-ts'
import { loadAppConfig } from './helpers'


const APP_IDS: string[] = [
  '0x0fe6b8bdb08ec31cf72c32af3c168ea1f09de36414edebdf6b3b1b7970093680',  // conviction-voting.aragonpm.eth
  '0xbc5e8545c829b4a2dd66039e0824a32c19e8159e699402865a9e18746f99c390',  // conviction-voting.1hive.aragonpm.eth
  '0x589851b3734f6578a92f33bfc26877a1166b95238be1f484deeaac6383d14c38',  // conviction-voting.open.aragonpm.eth 
  '0xe4691f497f5e74daf61612cea2d5a540b095805872218eaa9108aa5fd76779a2'   // conviction-beta.open.aragonpm.eth
]   

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
  APP_IDS.includes(appId)
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
