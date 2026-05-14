import type { ActividadRow } from '../api/use-activities'

export type ActivityCalculationInput = {
  unitsSold: number
  currentPaid: number
  quotaAmount: number
  hasQuota: boolean
}

export type ActivityCalculationResult = {
  gross: number
  promotion: number
  benefit: number
  appliedBenefit: number
  pendingBenefit: number
  qualifiesForBenefit: boolean
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export function calculateActivityParticipant(
  activity: ActividadRow,
  input: ActivityCalculationInput
): ActivityCalculationResult {
  const unitsSold = Number(input.unitsSold || 0)
  const gross = roundMoney(unitsSold * Number(activity.precio_unitario || 0))
  const qualifiesForBenefit = unitsSold >= Number(activity.minimo_unidades_beneficio || 0)

  if (!qualifiesForBenefit) {
    return {
      gross,
      promotion: gross,
      benefit: 0,
      appliedBenefit: 0,
      pendingBenefit: 0,
      qualifiesForBenefit,
    }
  }

  const promotion = roundMoney(unitsSold * Number(activity.monto_promocion_unitario || 0))
  const benefit = roundMoney(unitsSold * Number(activity.monto_beneficio_unitario || 0))
  const remainingDebt = input.hasQuota
    ? Math.max(0, Number(input.quotaAmount || 0) - Number(input.currentPaid || 0))
    : 0
  const appliedBenefit = roundMoney(Math.min(benefit, remainingDebt))
  const pendingBenefit = roundMoney(Math.max(benefit - appliedBenefit, 0))

  return {
    gross,
    promotion,
    benefit,
    appliedBenefit,
    pendingBenefit,
    qualifiesForBenefit,
  }
}
