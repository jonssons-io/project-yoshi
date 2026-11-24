// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { useAppForm } from '@/hooks/form'

const options = [
  {
    value: 'bills',
    label: 'Bills account'
  },
  {
    value: 'card',
    label: 'Card account'
  }
]

/**
 * Mirrors the edit drawers: the form mounts with empty values and is filled in
 * from loaded data right afterwards.
 */
function FormFilledAfterMount() {
  const form = useAppForm({
    defaultValues: {
      accountId: ''
    }
  })

  useEffect(() => {
    form.setFieldValue('accountId', 'card')
  }, [
    form
  ])

  return (
    <form>
      <form.AppField name="accountId">
        {(field) => (
          <field.SelectField
            label="Account"
            placeholder="Choose account"
            options={options}
          />
        )}
      </form.AppField>
      <form.Subscribe selector={(state) => state.values.accountId}>
        {(accountId) => <output data-testid="form-value">{accountId}</output>}
      </form.Subscribe>
    </form>
  )
}

afterEach(cleanup)

describe('SelectField', () => {
  it('keeps a value that is set right after the field mounts', async () => {
    render(<FormFilledAfterMount />)

    await waitFor(() =>
      expect(screen.getByRole('combobox').textContent).toContain('Card account')
    )
    expect(screen.getByTestId('form-value').textContent).toBe('card')
  })
})
