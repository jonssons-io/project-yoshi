import { PlusIcon } from 'lucide-react'
import type * as React from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/button/button'
import {
  Illustration,
  type IllustrationVariant
} from '@/components/illustrations/Illustration'
import { useHouseholdContext } from '@/contexts/household-context'
import { cn } from '@/lib/utils'

export type NoDataVariant =
  | 'no-household'
  | 'no-budget'
  | 'no-account'
  | 'no-category'
  | 'no-income'
  | 'no-bills'
  | 'no-transactions'

type NoDataConfig = {
  titleKey: string
  descriptionKey: string
  buttonKey: string
}

type IllustrationSize = 'sm' | 'md' | 'lg'

type NoDataProps = {
  variant: NoDataVariant
  /**
   * Rendered between the description and the primary action button (e.g. inline
   * field for household name on the no-household empty state).
   */
  beforeAction?: React.ReactNode
  onAction?: () => void
  /**
   * When set, overrides the default disabled logic for the action button.
   */
  actionDisabled?: boolean
  illustrationSize?: IllustrationSize
}

const NO_DATA_CONFIG: Record<NoDataVariant, NoDataConfig> = {
  'no-household': {
    titleKey: 'setup.noHouseholdTitle',
    descriptionKey: 'setup.noHouseholdDescription',
    buttonKey: 'setup.noHouseholdButton'
  },
  'no-budget': {
    titleKey: 'setup.noBudgetTitle',
    descriptionKey: 'setup.noBudgetDescription',
    buttonKey: 'setup.noBudgetButton'
  },
  'no-account': {
    titleKey: 'setup.noAccountTitle',
    descriptionKey: 'setup.noAccountDescription',
    buttonKey: 'setup.noAccountButton'
  },
  'no-category': {
    titleKey: 'setup.noCategoryTitle',
    descriptionKey: 'setup.noCategoryDescription',
    buttonKey: 'setup.noCategoryButton'
  },
  'no-income': {
    titleKey: 'setup.noIncomeTitle',
    descriptionKey: 'setup.noIncomeDescription',
    buttonKey: 'setup.noIncomeButton'
  },
  'no-bills': {
    titleKey: 'setup.noBillsTitle',
    descriptionKey: 'setup.noBillsDescription',
    buttonKey: 'setup.noBillsButton'
  },
  'no-transactions': {
    titleKey: 'setup.noTransactionsTitle',
    descriptionKey: 'setup.noTransactionsDescription',
    buttonKey: 'setup.noTransactionsButton'
  }
}

const ILLUSTRATIONS_MAP: Record<NoDataVariant, IllustrationVariant> = {
  'no-household': 'pana-no-household',
  'no-budget': 'pana-no-budget',
  'no-account': 'pana-no-account',
  'no-category': 'pana-no-category',
  'no-income': 'pana-no-income',
  'no-bills': 'pana-no-bills',
  'no-transactions': 'pana-no-transactions'
}

const ACTION_VARIANTS: NoDataVariant[] = [
  'no-household',
  'no-budget',
  'no-account',
  'no-category',
  'no-income',
  'no-bills',
  'no-transactions'
]

const ILLUSTRATION_SIZE_MAP: Record<IllustrationSize, string> = {
  sm: 'size-40',
  md: 'size-60',
  lg: 'size-80'
}

const TEXT_SIZE_MAP: Record<IllustrationSize, string> = {
  sm: 'w-80',
  md: 'w-100',
  lg: 'w-120'
}

/**
 * Reusable empty-state prompt with illustration, shown when a resource
 * has not been created yet or a list is empty (household, budget, account,
 * category, income, bills, transactions).
 */
export function NoData({
  variant,
  beforeAction,
  onAction,
  actionDisabled: actionDisabledProp,
  illustrationSize = 'md'
}: NoDataProps) {
  const { t } = useTranslation()
  const { selectedHouseholdId } = useHouseholdContext()

  const config = NO_DATA_CONFIG[variant]

  const defaultActionDisabled = useMemo(() => {
    if (variant === 'no-household') return false
    return !selectedHouseholdId
  }, [
    variant,
    selectedHouseholdId
  ])

  const isActionDisabled =
    actionDisabledProp !== undefined
      ? actionDisabledProp
      : defaultActionDisabled

  const handleAction = () => {
    if (ACTION_VARIANTS.includes(variant)) {
      onAction?.()
    }
  }

  return (
    <div className="flex flex-col justify-center items-center gap-6">
      <Illustration
        className={ILLUSTRATION_SIZE_MAP[illustrationSize]}
        variant={ILLUSTRATIONS_MAP[variant]}
      />
      <div className="flex flex-col items-center justify-center gap-2">
        <h2 className="type-title-large">{t(config.titleKey)}</h2>
        <p
          className={cn(
            'type-body-medium text-pretty text-center',
            TEXT_SIZE_MAP[illustrationSize]
          )}
        >
          {t(config.descriptionKey)}
        </p>
      </div>
      {beforeAction ? (
        <div
          className={cn(
            'flex w-full flex-col items-stretch',
            TEXT_SIZE_MAP[illustrationSize]
          )}
        >
          {beforeAction}
        </div>
      ) : null}
      <Button
        disabled={isActionDisabled}
        onClick={handleAction}
        icon={<PlusIcon />}
        label={t(config.buttonKey)}
      />
    </div>
  )
}
