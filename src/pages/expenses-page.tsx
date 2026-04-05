import { ExpensesTable } from '@/features/expenses/components/expenses-table'

export function ExpensesPage() {
  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6">
      <ExpensesTable />
    </div>
  )
}
