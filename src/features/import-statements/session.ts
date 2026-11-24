import type { ImportStatement } from './types'

let activeStatements: ImportStatement[] = []

export function setActiveStatements(statements: ImportStatement[]): void {
  activeStatements = statements
}

export function getActiveStatements(): ImportStatement[] {
  return activeStatements
}

export function clearActiveStatements(): void {
  activeStatements = []
}
