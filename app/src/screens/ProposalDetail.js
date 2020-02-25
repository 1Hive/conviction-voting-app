import React from 'react'
import {
  BackButton,
  Bar,
  Box,
  GU,
  Split,
  Text,
  textStyle,
  useLayout,
  useTheme,
} from '@aragon/ui'
import { useConnectedAccount } from '@aragon/api-react'
import LocalIdentityBadge from '../components/LocalIdentityBadge/LocalIdentityBadge'
import { addressesEqual } from '../web3-utils'

const DEFAULT_DESCRIPTION =
  'No additional description has been provided for this proposal.'

function ProposalDetail({ proposal, onBack }) {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const connectedAccount = useConnectedAccount()

  const { id, title, description, creator } = proposal

  return (
    <React.Fragment>
      <Bar>
        <BackButton onClick={onBack} />
      </Bar>
      <Split
        primary={
          <Box>
            <section
              css={`
                display: grid;
                grid-template-columns: auto;
                grid-gap: ${2.5 * GU}px;
                margin-top: ${2.5 * GU}px;
              `}
            >
              <h1
                css={`
                  ${textStyle('title2')};
                `}
              >
                <span css="font-weight: bold;">Proposal #{id}</span> - {title}
              </h1>
              <div
                css={`
                  display: grid;
                  grid-template-columns: ${layoutName === 'large'
                    ? '1fr minmax(300px, auto)'
                    : 'auto'};
                  grid-gap: ${layoutName === 'large' ? 5 * GU : 2.5 * GU}px;
                `}
              >
                <div>
                  <h2
                    css={`
                      ${textStyle('label2')};
                      color: ${theme.surfaceContentSecondary};
                      margin-bottom: ${2 * GU}px;
                    `}
                  >
                    Description
                  </h2>
                  <Text
                    css={`
                      ${textStyle('body2')};
                    `}
                  >
                    {description || DEFAULT_DESCRIPTION}
                  </Text>
                </div>
                <div>
                  <h2
                    css={`
                      ${textStyle('label2')};
                      color: ${theme.surfaceContentSecondary};
                      margin-bottom: ${2 * GU}px;
                    `}
                  >
                    Created By
                  </h2>
                  <div
                    css={`
                      display: flex;
                      align-items: flex-start;
                    `}
                  >
                    <LocalIdentityBadge
                      connectedAccount={addressesEqual(
                        creator,
                        connectedAccount
                      )}
                      entity={creator}
                    />
                  </div>
                </div>
              </div>
            </section>
          </Box>
        }
        secondary={<Box heading="Dummy">Dummy</Box>}
      />
    </React.Fragment>
  )
}

export default ProposalDetail
