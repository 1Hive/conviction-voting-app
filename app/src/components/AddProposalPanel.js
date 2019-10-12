import React, { useState } from 'react'
import { Button, Field, TextInput } from '@aragon/ui'
import styled from 'styled-components'

const AddProposalPanel = ({ onSubmit }) => {
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [amount, setAmount] = useState(0)
  const [beneficiary, setBeneficiary] = useState('')
  const disabled = false // TODO Disable when empty or invalid fields
  const onFormSubmit = event => {
    event.preventDefault()
    onSubmit({ title, link, amount, beneficiary })
  }
  return (
    <Form onSubmit={onFormSubmit}>
      <Field label="Title">
        <TextInput
          onChange={event => setTitle(event.target.value)}
          value={title}
          wide
          required
        />
      </Field>
      <Field label="Requested Amount">
        <TextInput
          type="number"
          value={amount}
          onChange={event => setAmount(event.target.value)}
          min={0}
          step="any"
          required
          wide
        />
      </Field>
      <Field label="Beneficiary">
        <TextInput
          onChange={event => setBeneficiary(event.target.value)}
          value={beneficiary}
          wide
          required
        />
      </Field>
      <Field label="Link">
        <TextInput
          onChange={event => setLink(event.target.value)}
          value={link}
          wide
        />
      </Field>
      <ButtonWrapper>
        <Button wide mode="strong" type="submit" disabled={disabled}>
          Submit
        </Button>
      </ButtonWrapper>
    </Form>
  )
}

const ButtonWrapper = styled.div`
  padding-top: 10px;
`
const Form = styled.form`
  margin: 16px 0;
`

export default AddProposalPanel
