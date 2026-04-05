import { EditBillBlueprintDrawer } from './edit-bill-blueprint-drawer'

export type EditBillBlueprintAllDrawerProps = {
  billId: string
  onClose: () => void
}

export function EditBillBlueprintAllDrawer({
  billId,
  onClose
}: EditBillBlueprintAllDrawerProps) {
  return (
    <EditBillBlueprintDrawer
      billId={billId}
      mode="all"
      onClose={onClose}
    />
  )
}
