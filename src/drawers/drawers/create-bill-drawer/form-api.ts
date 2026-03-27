import { useAppForm } from '@/components/form'

import { CREATE_BILL_DRAWER_DEFAULTS } from './types'

function createBillDrawerFormTypeProbe() {
  return useAppForm({
    defaultValues: CREATE_BILL_DRAWER_DEFAULTS,
    canSubmitWhenInvalid: true,
    onSubmit: async () => {}
  })
}

export type CreateBillDrawerForm = ReturnType<
  typeof createBillDrawerFormTypeProbe
>
