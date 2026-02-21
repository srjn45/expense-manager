import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ChartsPage } from './ChartsPage'
import { renderWithProviders } from '@/test/utils'
import { api } from '@/api/client'

vi.mock('@/api/client', () => ({
  api: {
    GET: vi.fn(),
  },
}))

// Recharts ResponsiveContainer needs real dimensions; jsdom has 0. Give chart a fixed size in tests.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: React.ReactNode
      width?: string
      height?: string
    }) => (
      <div style={{ width: 400, height: 320 }} data-testid="responsive-chart">
        {children}
      </div>
    ),
  }
})

const mockApi = vi.mocked(api)

function renderCharts(initialPath = '/charts') {
  return renderWithProviders(
    <MemoryRouter initialEntries={[initialPath]}>
      <ChartsPage />
    </MemoryRouter>
  )
}

describe('ChartsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  it('shows page title and subtitle', () => {
    mockApi.GET.mockResolvedValue({ data: { data: [] } } as never)
    renderCharts()
    expect(screen.getByRole('heading', { name: /charts/i })).toBeInTheDocument()
    expect(
      screen.getByText(/monthly trend, expense by category, and by payment method/i)
    ).toBeInTheDocument()
  })

  it('shows three tabs: Monthly trend, By category, By payment method', () => {
    mockApi.GET.mockResolvedValue({ data: { data: [] } } as never)
    renderCharts()
    expect(screen.getByRole('button', { name: /monthly trend/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /by category/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /by payment method/i })).toBeInTheDocument()
  })

  it('shows Monthly trend section by default with From/To date inputs', () => {
    mockApi.GET.mockResolvedValue({ data: { data: [] } } as never)
    renderCharts()
    expect(screen.getByLabelText(/date range start/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date range end/i)).toBeInTheDocument()
  })

  it('fetches monthly-expense when monthly range is valid', async () => {
    mockApi.GET.mockResolvedValue({
      data: { data: [{ month: '2025-01', totalExpense: 1000, totalRefund: 0 }] },
    } as never)
    renderCharts()
    await waitFor(() => {
      expect(mockApi.GET).toHaveBeenCalledWith(
        '/api/v1/analytics/monthly-expense',
        expect.objectContaining({
          params: {
            query: expect.objectContaining({
              from: expect.any(String),
              to: expect.any(String),
            }),
          },
        })
      )
    })
  })

  it('shows "No data for this range" when monthly data is empty and range valid', async () => {
    mockApi.GET.mockResolvedValue({ data: { data: [] } } as never)
    renderCharts()
    await waitFor(() => {
      expect(screen.getByText(/no data for this range/i)).toBeInTheDocument()
    })
  })

  it('shows bar chart when monthly data is returned', async () => {
    mockApi.GET.mockResolvedValue({
      data: {
        data: [
          { month: '2025-01', totalExpense: 1200, totalRefund: 100 },
          { month: '2025-02', totalExpense: 800, totalRefund: 0 },
        ],
      },
    } as never)
    renderCharts()
    await waitFor(() => {
      expect(screen.getByTestId('responsive-chart')).toBeInTheDocument()
    })
    expect(screen.queryByText(/no data for this range/i)).not.toBeInTheDocument()
  })

  it('switches to By category tab and shows month selector and Bar/Pie toggle', async () => {
    const user = userEvent.setup()
    mockApi.GET.mockResolvedValue({ data: { data: [] } } as never)
    renderCharts()
    await user.click(screen.getByRole('button', { name: /by category/i }))
    expect(screen.getByLabelText(/month for category breakdown/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^bar$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^pie$/i })).toBeInTheDocument()
  })

  it('fetches expense-by-category when By category tab is active', async () => {
    mockApi.GET.mockResolvedValue({ data: { data: [] } } as never)
    renderCharts('/charts?view=category')
    await waitFor(() => {
      expect(mockApi.GET).toHaveBeenCalledWith(
        '/api/v1/analytics/expense-by-category',
        expect.objectContaining({
          params: { query: { month: expect.stringMatching(/^\d{4}-\d{2}$/) } },
        })
      )
    })
    await waitFor(() => {
      expect(screen.getByText(/no expenses in this month/i)).toBeInTheDocument()
    })
  })

  it('shows category bar chart when by-category data is returned', async () => {
    mockApi.GET.mockResolvedValue({
      data: {
        data: [
          { categoryId: 'c1', categoryName: 'Food', amount: 500 },
          { categoryId: 'c2', categoryName: 'Transport', amount: 300 },
        ],
      },
    } as never)
    renderCharts('/charts?view=category')
    await waitFor(() => {
      expect(screen.getByTestId('responsive-chart')).toBeInTheDocument()
    })
    expect(screen.queryByText(/no expenses in this month/i)).not.toBeInTheDocument()
  })

  it('switches to By payment method tab and shows month selector and Bar/Pie toggle', async () => {
    const user = userEvent.setup()
    mockApi.GET.mockResolvedValue({ data: { data: [] } } as never)
    renderCharts()
    await user.click(screen.getByRole('button', { name: /by payment method/i }))
    expect(screen.getByLabelText(/month for payment method breakdown/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^bar$/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole('button', { name: /^pie$/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('fetches expense-by-payment-method when By payment method tab is active', async () => {
    mockApi.GET.mockResolvedValue({ data: { data: [] } } as never)
    renderCharts('/charts?view=payment-method')
    await waitFor(() => {
      expect(mockApi.GET).toHaveBeenCalledWith(
        '/api/v1/analytics/expense-by-payment-method',
        expect.objectContaining({
          params: { query: { month: expect.stringMatching(/^\d{4}-\d{2}$/) } },
        })
      )
    })
    await waitFor(() => {
      expect(screen.getByText(/no expenses in this month/i)).toBeInTheDocument()
    })
  })

  it('shows payment method bar chart when by-payment-method data is returned', async () => {
    mockApi.GET.mockResolvedValue({
      data: {
        data: [
          { paymentMethodId: 'p1', paymentMethodName: 'Card', amount: 1000 },
          { paymentMethodId: 'p2', paymentMethodName: 'Cash', amount: 400 },
        ],
      },
    } as never)
    renderCharts('/charts?view=payment-method')
    await waitFor(() => {
      expect(screen.getByTestId('responsive-chart')).toBeInTheDocument()
    })
    expect(screen.queryByText(/no expenses in this month/i)).not.toBeInTheDocument()
  })

  it('shows error message when monthly API returns error', async () => {
    mockApi.GET.mockRejectedValue(new Error('Network error'))
    renderCharts()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/network error/i)
    })
  })

  it('respects view=category from URL', () => {
    mockApi.GET.mockResolvedValue({ data: { data: [] } } as never)
    renderCharts('/charts?view=category')
    expect(screen.getByRole('button', { name: /by category/i })).toHaveAttribute(
      'aria-current',
      'true'
    )
  })

  it('respects view=payment-method from URL', () => {
    mockApi.GET.mockResolvedValue({ data: { data: [] } } as never)
    renderCharts('/charts?view=payment-method')
    expect(screen.getByRole('button', { name: /by payment method/i })).toHaveAttribute(
      'aria-current',
      'true'
    )
  })
})
