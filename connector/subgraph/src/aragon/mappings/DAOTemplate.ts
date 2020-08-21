import { DeployDao as DeployDaoEvent } from '../../../generated/DAOFactory@0.8.1/DAOTemplate'
import { SetupDao as SetupDaoEvent } from '../../../generated/DAOFactory@0.8.1/DAOTemplate'
import { DeployToken as DeployTokenEvent } from '../../../generated/DAOFactory@0.8.1/DAOTemplate'
import { InstalledApp as InstalledAppEvent } from '../../../generated/DAOFactory@0.8.1/DAOTemplate'
import * as aragon from '../aragon'

export function handleDeployDao(event: DeployDaoEvent): void {
  aragon.processOrg(event.params.dao)
}

export function handleInstalledApp(event: InstalledAppEvent): void {
  aragon.processApp(event.params.appProxy, event.params.appId.toHexString())
}

export function handleDeployToken(event: DeployTokenEvent): void {
  aragon.processToken(event.params.token)
}

export function handleSetupDao(event: SetupDaoEvent): void {}
