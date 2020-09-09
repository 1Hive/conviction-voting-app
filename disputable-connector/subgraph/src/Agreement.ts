import { Proposal as ProposalEntity } from '../generated/schema'
import { Agreement as AgreementContract, ActionDisputed as ActionDisputedEvent } from '../generated/templates/Agreement/Agreement'
import { getProposalEntityId } from './helpers'
import { STATUS_DISPUTED} from './proposal-statuses'

/* eslint-disable @typescript-eslint/no-use-before-define */

export function handleActionDisputed(event: ActionDisputedEvent): void {
  const agreementApp = AgreementContract.bind(event.address)
  const actionData = agreementApp.getAction(event.params.actionId)
  const challengeData = agreementApp.getChallenge(event.params.challengeId)
  const proposalId = getProposalEntityId(actionData.value0, actionData.value1)

  const proposal = ProposalEntity.load(proposalId)!
  proposal.status = STATUS_DISPUTED
  proposal.disputeId = challengeData.value8
  proposal.save()
}
