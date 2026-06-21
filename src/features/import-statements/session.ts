import type { StatementParseResult } from './types'

let activeStatement: StatementParseResult | null = null
let activeStatementFileName = ''

export function setActiveStatement(
  result: StatementParseResult,
  fileName = ''
): void {
  activeStatement = result
  activeStatementFileName = fileName
}

export function getActiveStatement(): StatementParseResult | null {
  return activeStatement
}

export function getActiveStatementFileName(): string {
  return activeStatementFileName
}

export function clearActiveStatement(): void {
  activeStatement = null
  activeStatementFileName = ''
}
