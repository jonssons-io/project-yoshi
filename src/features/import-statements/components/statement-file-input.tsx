import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { isSupportedStatementFile, parseStatementFile } from '../parser'
import type { StatementParseResult } from '../types'

export type StatementFileInputHandle = {
  open: () => void
}

type StatementFileInputProps = {
  inputRef: React.RefObject<StatementFileInputHandle | null>
  onParsed: (result: StatementParseResult, fileName: string) => void
}

export function StatementFileInput({
  inputRef,
  onParsed
}: StatementFileInputProps) {
  const nativeInputRef = useRef<HTMLInputElement>(null)
  const { t } = useTranslation()
  const [isParsing, setIsParsing] = useState(false)

  inputRef.current = {
    open: () => nativeInputRef.current?.click()
  }

  const handleFile = async (file: File | null | undefined) => {
    if (!file || isParsing) return

    if (!isSupportedStatementFile(file)) {
      toast.error(t('statementImport.errors.chooseXlsx'))
      return
    }

    setIsParsing(true)
    try {
      const result = await parseStatementFile(file)
      onParsed(result, file.name)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? t(error.message)
          : t('statementImport.errors.couldNotParse')
      )
    } finally {
      setIsParsing(false)
      if (nativeInputRef.current) {
        nativeInputRef.current.value = ''
      }
    }
  }

  return (
    <input
      ref={nativeInputRef}
      type="file"
      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      className="hidden"
      onChange={(event) => void handleFile(event.target.files?.[0])}
    />
  )
}
