import React, { useState } from 'react'
import { Button, Field, TextInput } from '@aragon/ui'
import styled from 'styled-components'

const AddProposalPanel = ({ onSubmit }) => {
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [amount, setAmount] = useState(0)
  const [recipient, setRecipient] = useState('')
  const disabled = false // TODO Disable when empty or invalid fields
  return (
    <Form onSubmit={() => onSubmit({ title, link, amount, recipient })}>
      <Field
        label="Title"
        css={`
          div {
            font-weight: 400;
          }
        `}
      >
        <TextInput
          onChange={event => setTitle(event.target.value)}
          value={title}
          wide
          required
        />
      </Field>
      <Field
        label="Requested Amount"
        css={`
          div {
            font-weight: 400;
          }
        `}
      >
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
      <Field
        label="Recipient"
        css={`
          div {
            font-weight: 400;
          }
        `}
      >
        <TextInput
          onChange={event => setRecipient(event.target.value)}
          value={recipient}
          wide
          required
        />
      </Field>
      <Field
        label="Link"
        css={`
          div {
            font-weight: 400;
          }
        `}
      >
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
