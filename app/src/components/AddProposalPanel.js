import React, { useCallback, useMemo, useState } from 'react'
import { useAppState } from '@aragon/api-react'
import {
  Button,
  DropDown,
  Field,
  GU,
  Info,
  isAddress,
  TextInput,
} from '@aragon/ui'
import LocalIdentitiesAutoComplete from './LocalIdentitiesAutoComplete/LocalIdentitiesAutoComplete'

import BigNumber from '../lib/bigNumber'
import { toDecimals } from '../lib/math-utils'
import { formatTokenAmount } from '../lib/token-utils'

import { calculateThreshold, getMaxConviction } from '../lib/conviction'

const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

const NULL_PROPOSAL_TYPE = -1
const FUNDING_PROPOSAL = 1

const AddProposalPanel = ({ onSubmit }) => {
  const { requestToken, stakeToken, globalParams } = useAppState()
  const { alpha, maxRatio, weight } = globalParams

  const [formData, setFormData] = useState({
    title: '',
    link: '',
    proposalType: NULL_PROPOSAL_TYPE,
    amount: {
      value: '0',
      valueBN: new BigNumber(0),
    },
    beneficiary: '',
  })

  const fundingMode = formData.proposalType === FUNDING_PROPOSAL

  const handleAmountEditMode = useCallback(
    editMode => {
      setFormData(formData => {
        const { amount } = formData

        const newValue = amount.valueBN.gte(0)
          ? formatTokenAmount(
              amount.valueBN,
              stakeToken.tokenDecimals,
              false,
              false,
              {
                commas: !editMode,
                replaceZeroBy: editMode ? '' : '0',
                rounding: stakeToken.tokenDecimals,
              }
            )
          : ''

        return {
          ...formData,
          amount: {
            ...amount,
            value: newValue,
          },
        }
      })
    },
    [stakeToken]
  )

  const handleTitleChange = useCallback(event => {
    const updatedTitle = event.target.value
    setFormData(formData => ({ ...formData, title: updatedTitle }))
  }, [])

  const handleAmountChange = useCallback(
    event => {
      const updatedAmount = event.target.value

      const newAmountBN = new BigNumber(
        isNaN(updatedAmount)
          ? -1
          : toDecimals(updatedAmount, stakeToken.tokenDecimals)
      )

      setFormData(formData => ({
        ...formData,
        amount: {
          value: updatedAmount,
          valueBN: newAmountBN,
        },
      }))
    },
    [stakeToken.tokenDecimals]
  )

  const handleBeneficiaryChange = useCallback(updatedBeneficiary => {
    setFormData(formData => ({ ...formData, beneficiary: updatedBeneficiary }))
  }, [])

  const handleLinkChange = useCallback(event => {
    const updatedLink = event.target.value
    setFormData(formData => ({ ...formData, link: updatedLink }))
  }, [])

  const handleProposalTypeChange = useCallback(selected => {
    setFormData(formData => ({
      ...formData,
      proposalType: selected,
    }))
  }, [])

  const handleFormSubmit = useCallback(
    event => {
      event.preventDefault()

      const { amount, beneficiary = ZERO_ADDR, link, title } = formData
      const convertedAmount = amount.valueBN.toString()

      onSubmit(title, link, convertedAmount, beneficiary)
    },
    [formData, onSubmit]
  )

  const errors = useMemo(() => {
    const errors = []

    const { amount, beneficiary, title } = formData
    if (requestToken) {
      if (amount.valueBN.eq(-1)) {
        errors.push('Invalid requested amount')
      }

      if (beneficiary && !isAddress(beneficiary)) {
        errors.push('Beneficiary is not a valid ethereum address')
      }

      return errors
    }

    return !title
  }, [formData, requestToken])

  const neededThreshold = useMemo(() => {
    const threshold = calculateThreshold(
      formData.amount.valueBN,
      requestToken.amount || 0,
      stakeToken.totalSupply || 0,
      alpha,
      maxRatio,
      weight
    )

    const max = getMaxConviction(stakeToken.totalSupply || 0, alpha)

    return Math.round((threshold / max) * 100)
  }, [alpha, formData.amount, maxRatio, requestToken, stakeToken, weight])

  const submitDisabled =
    formData.proposalType === NULL_PROPOSAL_TYPE ||
    (formData.proposalType === FUNDING_PROPOSAL &&
      (formData.amount.value === '0' || !formData.beneficiary)) ||
    !formData.title

  return (
    <form onSubmit={handleFormSubmit}>
      <Field
        label="Select proposal type"
        css={`
          margin-top: ${3 * GU}px;
        `}
      >
        <DropDown
          header="Select proposal type"
          placeholder="Proposal type"
          selected={formData.proposalType}
          onChange={handleProposalTypeChange}
          items={['Signaling proposal', 'Funding proposal']}
          required
          wide
        />
      </Field>
      <Field
        label="Title"
        css={`
          margin-top: ${2 * GU}px;
        `}
      >
        <TextInput
          onChange={handleTitleChange}
          value={formData.title}
          wide
          required
        />
      </Field>
      {requestToken && fundingMode && (
        <>
          <Field
            label="Requested Amount"
            onFocus={() => handleAmountEditMode(true)}
            onBlur={() => handleAmountEditMode(false)}
          >
            <TextInput
              value={formData.amount.value}
              onChange={handleAmountChange}
              required
              wide
            />
          </Field>
          <Field label="Beneficiary">
            <LocalIdentitiesAutoComplete
              onChange={handleBeneficiaryChange}
              value={formData.beneficiary}
              wide
              required
            />
          </Field>
        </>
      )}
      <Field label="Link">
        <TextInput onChange={handleLinkChange} value={formData.link} wide />
      </Field>
      {errors.length > 0 && (
        <Info
          mode="warning"
          css={`
            margin-bottom: ${2 * GU}px;
          `}
        >
          {errors.map((err, index) => (
            <div key={index}>{err}</div>
          ))}
        </Info>
      )}
      <Button
        wide
        mode="strong"
        type="submit"
        disabled={submitDisabled || errors.length > 0}
      >
        Submit
      </Button>
      {formData.proposalType !== NULL_PROPOSAL_TYPE && (
        <Info
          title="Action"
          css={`
            margin-top: ${3 * GU}px;
          `}
        >
          {fundingMode ? (
            <>
              <span>
                This action will create a proposal which can be voted on
              </span>{' '}
              <span
                css={`
                  font-weight: 700;
                `}
              >
                by staking {stakeToken.symbol}.
              </span>{' '}
              <span>
                The action will be executable if the accrued total stake reaches
                above the threshold.
              </span>
            </>
          ) : (
            <>
              <span>
                This action will create a proposal which can be voted on,
              </span>{' '}
              <span
                css={`
                  font-weight: 700;
                `}
              >
                it’s a proposal without a requested amount.
              </span>{' '}
              <span>The action will not be executable.</span>
            </>
          )}
        </Info>
      )}
      {formData.amount.valueBN.gte(0) && (
        <Info
          mode={isFinite(neededThreshold) ? 'info' : 'warning'}
          css={`
            margin-top: ${2 * GU}px;
          `}
        >
          {isFinite(neededThreshold)
            ? `Required conviction for requested amount in order for the proposal to
          pass is ~%${neededThreshold}`
            : `Proposal might never pass with requested amount`}
        </Info>
      )}
    </form>
  )
}

export default AddProposalPanel
