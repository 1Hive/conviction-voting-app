import React, { useState } from 'react'
import { Button, Field, TextInput } from '@aragon/ui'
import styled from 'styled-components'

const AddProposalPanel = ({ onSubmit }) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('Lorem ipsum...')
  const [amount, setAmount] = useState(0)
  const [recipient, setRecipient] = useState('')
  const disabled = false // TODO Disable when empty or invalid fields
  const onFormSubmit = event => {
    event.preventDefault()
    onSubmit({ title, description, amount, recipient })
  }
  return (
    <form onSubmit={onFormSubmit}>
      <Field label="Title">
        <TextInput
          onChange={event => setTitle(event.target.value)}
          value={title}
          wide
          required
        />
      </Field>
      <Field label="Description">
        <TextInput
          onChange={event => setDescription(event.target.value)}
          value={description}
          wide
          multiline
        />
      </Field>
      <Field label="Requested Amount">
        <TextInput.Number
          value={amount}
          onChange={event => setAmount(event.target.value)}
          min={0}
          step="any"
          required
          wide
        />
      </Field>
      <Field label="Recipient">
        <TextInput
          onChange={event => setRecipient(event.target.value)}
          value={recipient}
          wide
          required
        />
      </Field>
      <ButtonWrapper>
        <Button wide mode="strong" type="submit" disabled={disabled}>
          Create proposal
        </Button>
      </ButtonWrapper>
    </form>
  )
}

const ButtonWrapper = styled.div`
  padding-top: 10px;
`

export default AddProposalPanel
