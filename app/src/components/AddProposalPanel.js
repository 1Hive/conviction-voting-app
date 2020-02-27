import React, { useState, useEffect } from 'react'
import { Button, Field, TextInput } from '@aragon/ui'
import styled from 'styled-components'

const AddProposalPanel = ({ onSubmit }) => {
  const [form, setForm] = useState({
    title: '',
    link: '',
    amount: 0,
    beneficiary: '',
    description: '',
  })
  const [isDisabled, setStatus] = useState(true)

  const isFormValid = form => form.filter(i => i === '' || i === 0).length === 0

  useEffect(() => {
    const values = Object.values(form)
    if (isFormValid(values)) return setStatus(false)
    return setStatus(true)
  }, [form])

  const onFormSubmit = event => {
    event.preventDefault()
    onSubmit(form)
  }

  return (
    <Form onSubmit={onFormSubmit}>
      <Field label="Title">
        <TextInput
          onChange={event => setForm({ ...form, title: event.target.value })}
          value={form.title}
          wide
          required
        />
      </Field>
      <Field label="Description">
        <TextInput
          onChange={event =>
            setForm({ ...form, description: event.target.value })
          }
          value={form.description}
          wide
          multiline
        />
      </Field>
      <Field label="Requested Amount">
        <TextInput
          type="number"
          value={form.amount}
          onChange={event => setForm({ ...form, amount: event.target.value })}
          min={0}
          step="any"
          required
          wide
        />
      </Field>
      <Field label="Recipient">
        <TextInput
          onChange={event =>
            setForm({ ...form, beneficiary: event.target.value })
          }
          value={form.beneficiary}
          wide
          required
        />
      </Field>
      <Field label="Link">
        <TextInput
          onChange={event => setForm({ ...form, link: event.target.value })}
          value={form.link}
          wide
        />
      </Field>
      <ButtonWrapper>
        <Button wide mode="strong" type="submit" disabled={isDisabled}>
          Create proposal
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
