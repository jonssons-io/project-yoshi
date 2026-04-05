import { EditBillBlueprintDrawer } from './edit-bill-blueprint-drawer'

export type EditBillBlueprintUpcomingDrawerProps = {
  billId: string
  onClose: () => void
}

export function EditBillBlueprintUpcomingDrawer({
  billId,
  onClose
}: EditBillBlueprintUpcomingDrawerProps) {
  return (
    <EditBillBlueprintDrawer
      billId={billId}
      mode="upcoming"
      onClose={onClose}
    />
  )
}
