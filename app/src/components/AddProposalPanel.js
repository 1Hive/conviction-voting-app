import React, { useState, useEffect } from 'react'
import { useAppState } from '@aragon/api-react'
import { Button, Field, TextInput } from '@aragon/ui'
import styled from 'styled-components'
import LocalIdentitiesAutoComplete from './LocalIdentitiesAutoComplete/LocalIdentitiesAutoComplete'

const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

const AddProposalPanel = ({ onSubmit }) => {
  const { requestToken } = useAppState()
  const [form, setForm] = useState({
    title: '',
    link: '',
    amount: '0',
    beneficiary: '',
  })
  const [isDisabled, setDisabled] = useState(true)

  useEffect(() => {
    requestToken
      ? setDisabled(
          form.title === '' || form.amount === '' || form.beneficiary === ''
        )
      : setDisabled(form.title === '')
  }, [form])

  const onFormSubmit = event => {
    event.preventDefault()
    if (form.beneficiary === '') form.beneficiary = ZERO_ADDR
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
      {requestToken && (
        <>
          <Field label="Requested Amount">
            <TextInput
              type="number"
              value={form.amount}
              onChange={event =>
                setForm({ ...form, amount: event.target.value })
              }
              min={0}
              step="any"
              required
              wide
            />
          </Field>
          <Field label="Beneficiary">
            <LocalIdentitiesAutoComplete
              onChange={beneficiary => setForm({ ...form, beneficiary })}
              value={form.beneficiary}
              wide
              required
            />
          </Field>
        </>
      )}
      <Field label="Link">
        <TextInput
          onChange={event => setForm({ ...form, link: event.target.value })}
          value={form.link}
          wide
        />
      </Field>
      <ButtonWrapper>
        <Button wide mode="strong" type="submit" disabled={isDisabled}>
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
