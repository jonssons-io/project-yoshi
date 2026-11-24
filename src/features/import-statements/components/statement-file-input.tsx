import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { isSupportedStatementFile, parseStatementFile } from '../parser'
import type { ImportStatement } from '../types'

export type StatementFileInputHandle = {
  open: () => void
}

type StatementFileInputProps = {
  inputRef: React.RefObject<StatementFileInputHandle | null>
  /** Called with every file that could be parsed, in the order chosen. */
  onParsed: (statements: ImportStatement[]) => void
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

  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? [])
    if (files.length === 0 || isParsing) return

    setIsParsing(true)
    try {
      const statements: ImportStatement[] = []

      // One unreadable file should not throw away the others.
      for (const file of files) {
        if (!isSupportedStatementFile(file)) {
          toast.error(`${file.name}: ${t('statementImport.errors.chooseXlsx')}`)
          continue
        }

        try {
          statements.push({
            fileName: file.name,
            result: await parseStatementFile(file)
          })
        } catch (error) {
          const message =
            error instanceof Error
              ? t(error.message)
              : t('statementImport.errors.couldNotParse')
          toast.error(files.length > 1 ? `${file.name}: ${message}` : message)
        }
      }

      if (statements.length > 0) onParsed(statements)
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
      multiple={true}
      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      className="hidden"
      onChange={(event) => void handleFiles(event.target.files)}
    />
  )
}
