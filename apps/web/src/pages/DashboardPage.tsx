import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { api } from '@/api/client'
import type { LedgerEntry } from '@/types/ledger-entry'
import { QueryErrorAlert } from '@/components/QueryErrorAlert'
import { LoadingSpinner } from '@/components/LoadingSpinner'

const DASHBOARD_QUERY_KEY = ['analytics', 'dashboard'] as const
const YEARS_QUERY_KEY = ['analytics', 'years'] as const
const MONTHLY_QUERY_KEY = ['analytics', 'monthly-expense'] as const

function formatAmountWithCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatAmount(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const formatted = formatter.format(Math.abs(amount))
  return amount < 0 ? `−${currency} ${formatted}` : `${currency} ${formatted}`
}

interface TotalByCurrency {
  currency: string
  totalExpense?: number
  totalRefund?: number
}

interface DashboardData {
  totalExpenseByCurrency: TotalByCurrency[]
  totalRefundByCurrency: { currency: string; totalRefund: number }[]
  entryCount: number
  lastEntries: LedgerEntry[]
}

interface MonthlyDatum {
  month: string
  totalExpense: number
  totalRefund: number
}

function useYears() {
  return useQuery({
    queryKey: YEARS_QUERY_KEY,
    queryFn: async (): Promise<number[]> => {
      const res = await api.GET('/api/v1/analytics/years', {})
      if (res.error) {
        const detail = (res.error as { detail?: unknown }).detail
        const msg = detail != null ? String(detail) : 'Failed to load years'
        throw new Error(msg)
      }
      const d = res.data as { data?: number[] }
      return d.data ?? []
    },
  })
}

function useDashboard(from: string, to: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, from, to],
    enabled: enabled && Boolean(from && to),
    queryFn: async (): Promise<DashboardData> => {
      const res = await api.GET('/api/v1/analytics/dashboard', {
        params: { query: { from, to } },
      })
      if (res.error) {
        const detail = (res.error as { detail?: unknown }).detail
        const msg = detail != null ? String(detail) : 'Failed to load dashboard'
        throw new Error(msg)
      }
      const d = res.data as unknown as DashboardData
      return {
        totalExpenseByCurrency: d.totalExpenseByCurrency ?? [],
        totalRefundByCurrency: d.totalRefundByCurrency ?? [],
        entryCount: d.entryCount ?? 0,
        lastEntries: d.lastEntries ?? [],
      }
    },
  })
}

function useMonthlyExpense(from: string, to: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [...MONTHLY_QUERY_KEY, from, to],
    enabled: enabled && Boolean(from && to),
    queryFn: async (): Promise<MonthlyDatum[]> => {
      const res = await api.GET('/api/v1/analytics/monthly-expense', {
        params: { query: { from, to } },
      })
      if (res.error) {
        const detail = (res.error as { detail?: unknown }).detail
        const msg = detail != null ? String(detail) : 'Failed to load monthly expense'
        throw new Error(msg)
      }
      const body = res.data as { data?: MonthlyDatum[] }
      return body.data ?? []
    },
  })
}

export function DashboardPage() {
  const yearsQuery = useYears()
  const years = yearsQuery.data ?? []
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  const displayYear = selectedYear ?? (years.length > 0 ? years[0] : null) ?? currentYear
  const from = `${displayYear}-01-01`
  const to = `${displayYear}-12-31`
  const yearOptions = years.length > 0 ? years : [currentYear]

  const dashboard = useDashboard(from, to, yearsQuery.isSuccess)
  const monthly = useMonthlyExpense(from, to, yearsQuery.isSuccess)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Summary and recent entries for the selected year.
        </p>
      </div>

      {/* Year selector */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="dashboard-year" className="block text-xs font-medium text-gray-600">
              Year
            </label>
            <select
              id="dashboard-year"
              value={displayYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm"
              aria-label="Select year"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        {yearsQuery.isLoading && <p className="mt-2 text-sm text-gray-500">Loading years…</p>}
        {yearsQuery.isSuccess && years.length === 0 && (
          <p className="mt-2 text-sm text-gray-500">No data yet. Add entries to see years.</p>
        )}
      </div>

      {dashboard.error && (
        <QueryErrorAlert message={dashboard.error.message} onRetry={() => dashboard.refetch()} />
      )}

      {dashboard.isLoading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <LoadingSpinner />
          <span>Loading…</span>
        </div>
      ) : dashboard.error ? null : dashboard.data ? (
        <>
          {/* Summary: expense, refund, transactions in one row */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Summary</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Expense
                </p>
                {dashboard.data.totalExpenseByCurrency.length === 0 ? (
                  <p className="mt-1 text-xl font-semibold text-gray-900">
                    {formatAmountWithCurrency(0, 'INR')}
                  </p>
                ) : (
                  <div className="mt-1 space-y-1">
                    {dashboard.data.totalExpenseByCurrency.map((row) => (
                      <p key={row.currency} className="text-xl font-semibold text-gray-900">
                        {formatAmountWithCurrency(row.totalExpense ?? 0, row.currency)}
                      </p>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-sm text-gray-600">Sum of expenses in this year.</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Refund</p>
                {dashboard.data.totalRefundByCurrency.length === 0 ? (
                  <p className="mt-1 text-xl font-semibold text-gray-900">
                    {formatAmountWithCurrency(0, 'INR')}
                  </p>
                ) : (
                  <div className="mt-1 space-y-1">
                    {dashboard.data.totalRefundByCurrency.map((row) => (
                      <p key={row.currency} className="text-xl font-semibold text-gray-900">
                        {formatAmountWithCurrency(row.totalRefund ?? 0, row.currency)}
                      </p>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-sm text-gray-600">Refunds in this year.</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Transactions
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {dashboard.data.entryCount}
                </p>
                <p className="mt-1 text-sm text-gray-600">Total entries in this year.</p>
              </div>
            </div>
          </div>

          {/* Monthly trend chart */}
          {monthly.data && monthly.data.length > 0 && (
            <section
              aria-labelledby="monthly-trend-heading"
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <h2 id="monthly-trend-heading" className="text-lg font-medium text-gray-900">
                Monthly trend
              </h2>
              <div className="mt-4 h-[280px] w-full">
                <MonthlyTrendChart
                  data={monthly.data}
                  currencyCode={dashboard.data.totalExpenseByCurrency[0]?.currency ?? 'INR'}
                />
              </div>
            </section>
          )}

          {/* Last entries */}
          <section aria-labelledby="last-entries-heading">
            <h2 id="last-entries-heading" className="text-lg font-medium text-gray-900">
              Recent entries
            </h2>
            {dashboard.data.lastEntries.length === 0 ? (
              <p className="mt-2 text-gray-600">No entries in this year.</p>
            ) : (
              <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600"
                      >
                        Description
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600"
                      >
                        Category
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600"
                      >
                        Payment method
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-600"
                      >
                        Amount
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600"
                      >
                        Tags
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {dashboard.data.lastEntries.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                          {row.date}
                        </td>
                        <td
                          className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-900"
                          title={row.description}
                        >
                          {row.description}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {row.categoryName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                          {row.paymentMethodName}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-3 text-right text-sm font-medium ${
                            Number(row.amount) < 0 ? 'text-red-600' : 'text-gray-900'
                          }`}
                        >
                          {formatAmount(Number(row.amount), row.currency)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {row.tags?.length ? row.tags.join(', ') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {dashboard.data.lastEntries.length > 0 && (
              <p className="mt-2">
                <Link to="/ledger" className="text-sm font-medium text-gray-900 hover:underline">
                  View in Ledger
                </Link>
              </p>
            )}
          </section>

          {/* Links to charts */}
          <p className="text-sm text-gray-600">
            View{' '}
            <Link to="/charts?view=monthly" className="font-medium text-gray-900 hover:underline">
              Monthly trend
            </Link>{' '}
            (bar chart) ·{' '}
            <Link to="/charts?view=category" className="font-medium text-gray-900 hover:underline">
              By category
            </Link>{' '}
            ·{' '}
            <Link
              to="/charts?view=payment-method"
              className="font-medium text-gray-900 hover:underline"
            >
              By payment method
            </Link>{' '}
            (bar/pie).
          </p>
        </>
      ) : (
        <p className="text-gray-500">Loading…</p>
      )}
    </div>
  )
}

function MonthlyTrendChart({ data, currencyCode }: { data: MonthlyDatum[]; currencyCode: string }) {
  const formatAxis = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(value)
  return (
    <ResponsiveBarChart
      data={data}
      formatAxis={formatAxis}
      formatTooltip={(v: number) =>
        new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: currencyCode,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(v)
      }
    />
  )
}

const EXPENSE_COLOR = '#059669'
const REFUND_COLOR = '#DC2626'

function ResponsiveBarChart({
  data,
  formatAxis,
  formatTooltip,
}: {
  data: MonthlyDatum[]
  formatAxis: (v: number) => string
  formatTooltip: (v: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatAxis}
        />
        <Tooltip
          formatter={(value: number | undefined) => [formatTooltip(value ?? 0), '']}
          labelFormatter={(label) => `Month: ${label}`}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid #e5e7eb',
          }}
        />
        <Legend />
        <Bar dataKey="totalExpense" name="Expense" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} />
        <Bar dataKey="totalRefund" name="Refund" fill={REFUND_COLOR} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
