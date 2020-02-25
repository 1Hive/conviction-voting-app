import React from 'react'
import { Button, EmptyStateCard, GU, LoadingRing } from '@aragon/ui'
import noProposalsPng from '../assets/no-proposals.png'

const NoProposals = React.memo(function NoProposals({
  onNewProposal,
  isSyncing,
}) {
  return (
    <EmptyStateCard
      text={
        isSyncing ? (
          <div
            css={`
              display: grid;
              align-items: center;
              justify-content: center;
              grid-template-columns: auto auto;
              grid-gap: ${1 * GU}px;
            `}
          >
            <LoadingRing />
            <span>Syncing…</span>
          </div>
        ) : (
          'No proposals here!'
        )
      }
      action={
        <Button wide mode="strong" onClick={onNewProposal}>
          Create a new proposal
        </Button>
      }
      illustration={
        <img
          css={`
            margin: auto;
            height: 170px;
          `}
          src={noProposalsPng}
          alt="No proposal here"
        />
      }
    />
  )
})

export default NoProposals
