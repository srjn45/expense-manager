import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from './DashboardPage'
import { renderWithProviders } from '@/test/utils'
import { api } from '@/api/client'
import type { LedgerEntry } from '@/types/ledger-entry'

vi.mock('@/api/client', () => ({
  api: {
    GET: vi.fn(),
  },
}))

const mockApi = vi.mocked(api)

const defaultDashboardResponse = {
  data: {
    totalExpenseByCurrency: [],
    totalRefundByCurrency: [],
    entryCount: 0,
    lastEntries: [],
  },
  error: undefined,
} as never

const defaultYearsResponse = {
  data: { data: [2025, 2024] },
  error: undefined,
} as never

const defaultMonthlyResponse = {
  data: { data: [] },
  error: undefined,
} as never

function defaultGetMock(path: string) {
  if (path === '/api/v1/analytics/years') {
    return Promise.resolve(defaultYearsResponse)
  }
  if (path === '/api/v1/analytics/dashboard') {
    return Promise.resolve(defaultDashboardResponse)
  }
  if (path === '/api/v1/analytics/monthly-expense') {
    return Promise.resolve(defaultMonthlyResponse)
  }
  return Promise.resolve(defaultDashboardResponse)
}

function renderDashboard() {
  return renderWithProviders(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
    mockApi.GET.mockImplementation((path: string) => defaultGetMock(path))
  })

  it('shows page title and subtitle', async () => {
    renderDashboard()
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getByText(/summary and recent entries for the selected year/i)
      ).toBeInTheDocument()
    })
  })

  it('shows year selector and fetches years', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(mockApi.GET).toHaveBeenCalledWith('/api/v1/analytics/years', expect.any(Object))
    })
    const yearSelect = screen.getByLabelText(/select year/i)
    expect(yearSelect).toBeInTheDocument()
    expect(yearSelect.tagName).toBe('SELECT')
  })

  it('fetches dashboard and monthly-expense with from and to derived from selected year', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(mockApi.GET).toHaveBeenCalledWith(
        '/api/v1/analytics/dashboard',
        expect.objectContaining({
          params: {
            query: expect.objectContaining({
              from: '2025-01-01',
              to: '2025-12-31',
            }),
          },
        })
      )
    })
    expect(mockApi.GET).toHaveBeenCalledWith(
      '/api/v1/analytics/monthly-expense',
      expect.objectContaining({
        params: {
          query: expect.objectContaining({
            from: '2025-01-01',
            to: '2025-12-31',
          }),
        },
      })
    )
  })

  it('shows per-currency summary when data is returned', async () => {
    mockApi.GET.mockImplementation((path: string) => {
      if (path === '/api/v1/analytics/dashboard') {
        return Promise.resolve({
          data: {
            totalExpenseByCurrency: [{ currency: 'INR', totalExpense: 12345.5 }],
            totalRefundByCurrency: [{ currency: 'INR', totalRefund: 200 }],
            entryCount: 42,
            lastEntries: [],
          },
        } as never)
      }
      return defaultGetMock(path)
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText(/^summary$/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/^expense$/i)).toBeInTheDocument()
    expect(screen.getByText(/^refund$/i)).toBeInTheDocument()
    expect(screen.getByText(/^transactions$/i)).toBeInTheDocument()
    expect(screen.getByText(/42/)).toBeInTheDocument()
    expect(screen.getByText(/total entries in this year/i)).toBeInTheDocument()
  })

  it('shows Recent entries section and "No entries in this year" when lastEntries empty', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /recent entries/i })).toBeInTheDocument()
    })
    expect(screen.getByText(/no entries in this year/i)).toBeInTheDocument()
  })

  it('shows last entries table when lastEntries has data', async () => {
    const entries: LedgerEntry[] = [
      {
        id: 'e1',
        date: '2025-02-15',
        description: 'Coffee',
        categoryId: 'c1',
        categoryName: 'Food',
        paymentMethodId: 'p1',
        paymentMethodName: 'Card',
        currency: 'INR',
        amount: 150,
        tags: ['work'],
        createdAt: '2025-02-15T10:00:00Z',
        updatedAt: '2025-02-15T10:00:00Z',
      },
    ]
    mockApi.GET.mockImplementation((path: string) => {
      if (path === '/api/v1/analytics/dashboard') {
        return Promise.resolve({
          data: {
            totalExpenseByCurrency: [{ currency: 'INR', totalExpense: 150 }],
            totalRefundByCurrency: [{ currency: 'INR', totalRefund: 0 }],
            entryCount: 1,
            lastEntries: entries,
          },
        } as never)
      }
      return defaultGetMock(path)
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Coffee')).toBeInTheDocument()
    })
    expect(screen.getByText('2025-02-15')).toBeInTheDocument()
    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getByText('Card')).toBeInTheDocument()
    expect(screen.getByText(/INR 150\.00/)).toBeInTheDocument()
    expect(screen.getByText('work')).toBeInTheDocument()
  })

  it('shows View in Ledger link when there are last entries', async () => {
    mockApi.GET.mockImplementation((path: string) => {
      if (path === '/api/v1/analytics/dashboard') {
        return Promise.resolve({
          data: {
            totalExpenseByCurrency: [],
            totalRefundByCurrency: [],
            entryCount: 1,
            lastEntries: [
              {
                id: 'e1',
                date: '2025-02-01',
                description: 'Test',
                categoryId: 'c1',
                categoryName: 'Food',
                paymentMethodId: 'p1',
                paymentMethodName: 'Card',
                currency: 'INR',
                amount: 100,
                tags: [],
                createdAt: '',
                updatedAt: '',
              },
            ],
          },
        } as never)
      }
      return defaultGetMock(path)
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /view in ledger/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /view in ledger/i })).toHaveAttribute('href', '/ledger')
  })

  it('shows links to charts: Monthly trend, By category, By payment method', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /monthly trend/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /monthly trend/i })).toHaveAttribute(
      'href',
      '/charts?view=monthly'
    )
    expect(screen.getByRole('link', { name: /by category/i })).toHaveAttribute(
      'href',
      '/charts?view=category'
    )
    expect(screen.getByRole('link', { name: /by payment method/i })).toHaveAttribute(
      'href',
      '/charts?view=payment-method'
    )
  })

  it('refetches dashboard and monthly-expense when year changes', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await waitFor(() => {
      expect(mockApi.GET).toHaveBeenCalledWith(
        '/api/v1/analytics/dashboard',
        expect.objectContaining({
          params: { query: { from: '2025-01-01', to: '2025-12-31' } },
        })
      )
    })
    await waitFor(() => {
      expect(screen.getByRole('option', { name: '2024' })).toBeInTheDocument()
    })
    const yearSelect = screen.getByLabelText(/select year/i)
    await user.selectOptions(yearSelect, '2024')
    await waitFor(() => {
      expect(mockApi.GET).toHaveBeenCalledWith(
        '/api/v1/analytics/dashboard',
        expect.objectContaining({
          params: { query: { from: '2024-01-01', to: '2024-12-31' } },
        })
      )
    })
  })

  it('shows monthly trend section when monthly data is returned', async () => {
    mockApi.GET.mockImplementation((path: string) => {
      if (path === '/api/v1/analytics/monthly-expense') {
        return Promise.resolve({
          data: {
            data: [
              { month: '2025-01', totalExpense: 50, totalRefund: 0 },
              { month: '2025-02', totalExpense: 100, totalRefund: 10 },
            ],
          },
        } as never)
      }
      if (path === '/api/v1/analytics/dashboard') {
        return Promise.resolve({
          data: {
            totalExpenseByCurrency: [{ currency: 'INR', totalExpense: 150 }],
            totalRefundByCurrency: [{ currency: 'INR', totalRefund: 10 }],
            entryCount: 2,
            lastEntries: [],
          },
        } as never)
      }
      return defaultGetMock(path)
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /monthly trend/i })).toBeInTheDocument()
    })
    const monthlyCalls = mockApi.GET.mock.calls.filter(
      (call) => call[0] === '/api/v1/analytics/monthly-expense'
    )
    expect(monthlyCalls.length).toBeGreaterThanOrEqual(1)
    const opts = monthlyCalls[0][1] as { params?: { query?: Record<string, unknown> } } | undefined
    expect(opts?.params?.query).toMatchObject({
      from: expect.stringMatching(/^\d{4}-01-01$/),
      to: expect.stringMatching(/^\d{4}-12-31$/),
    })
  })

  it('shows error message and Retry when API returns error', async () => {
    mockApi.GET.mockImplementation((path: string) => {
      if (path === '/api/v1/analytics/years') {
        return Promise.resolve(defaultYearsResponse)
      }
      return Promise.reject(new Error('Server error'))
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/server error/i)
    })
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
