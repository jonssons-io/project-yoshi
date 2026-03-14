import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'

type ConfirmDialogOptions = {
  title?: string
  description: string
  confirmText?: string
  cancelText?: string
}

type ConfirmDialogState = ConfirmDialogOptions & {
  open: boolean
  resolve?: (value: boolean) => void
}

export function useConfirmDialog() {
  const { t } = useTranslation()
  const [dialogState, setDialogState] = useState<ConfirmDialogState>({
    open: false,
    description: ''
  })

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        open: true,
        resolve,
        ...options
      })
    })
  }, [])

  const closeWithResult = useCallback((result: boolean) => {
    setDialogState((current) => {
      current.resolve?.(result)
      return {
        open: false,
        description: ''
      }
    })
  }, [])

  const dialog = useMemo(
    () => (
      <AlertDialog
        open={dialogState.open}
        onOpenChange={(open) => {
          if (!open) closeWithResult(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogState.title ?? t('common.confirmAction')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogState.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {dialogState.cancelText ?? t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => closeWithResult(true)}>
              {dialogState.confirmText ?? t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ),
    [
      closeWithResult,
      dialogState,
      t
    ]
  )

  return {
    confirm,
    confirmDialog: dialog
  }
}
