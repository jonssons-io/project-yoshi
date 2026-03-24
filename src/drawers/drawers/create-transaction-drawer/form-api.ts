import { useAppForm } from '@/hooks/form'

import { DRAWER_DEFAULT_VALUES } from './types'

/**
 * In `.ts` files, `ReturnType<(typeof useAppForm)<T>>` parses `<` as comparison.
 * A local probe keeps the form API correctly typed for child components.
 */
function createTransactionDrawerFormTypeProbe() {
  return useAppForm({
    defaultValues: DRAWER_DEFAULT_VALUES,
    canSubmitWhenInvalid: true,
    onSubmit: async () => {}
  })
}

/** Typed form handle for subcomponents (avoids `any` / `@ts-nocheck`). */
export type CreateTransactionDrawerForm = ReturnType<
  typeof createTransactionDrawerFormTypeProbe
>
