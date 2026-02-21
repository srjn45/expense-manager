import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LedgerPage } from './LedgerPage'
import { renderWithProviders } from '@/test/utils'
import { api } from '@/api/client'
import type { LedgerEntry } from '@/types/ledger-entry'
import type { PaymentMethod } from '@/types/payment-method'
import type { Category } from '@/types/category'

vi.mock('@/api/client', () => ({
  api: {
    GET: vi.fn(),
    POST: vi.fn(),
    PUT: vi.fn(),
    DELETE: vi.fn(),
  },
}))

const mockApi = vi.mocked(api)

function defaultGetMock(path: string) {
  if (path === '/api/v1/ledger-entries') {
    return Promise.resolve({
      data: { data: [], nextCursor: null },
      error: undefined,
      response: {} as Response,
    } as never)
  }
  if (path === '/api/v1/payment-methods') {
    return Promise.resolve({
      data: { data: [] as PaymentMethod[] },
      error: undefined,
      response: {} as Response,
    } as never)
  }
  if (path === '/api/v1/categories') {
    return Promise.resolve({
      data: { data: [] as Category[] },
      error: undefined,
      response: {} as Response,
    } as never)
  }
  if (path.startsWith('/api/v1/tag-suggestions')) {
    return Promise.resolve({
      data: { suggestions: [] as string[] },
      error: undefined,
      response: {} as Response,
    } as never)
  }
  return Promise.resolve({ data: {}, error: undefined, response: {} as Response } as never)
}

describe('LedgerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
    mockApi.GET.mockImplementation((path: string) => defaultGetMock(path))
  })

  it('shows page title and subtitle', async () => {
    renderWithProviders(<LedgerPage />)
    expect(screen.getByRole('heading', { name: /^ledger$/i })).toBeInTheDocument()
    expect(
      screen.getByText(/all your expense and refund entries\. newest first/i)
    ).toBeInTheDocument()
  })

  it('shows empty state when no entries', async () => {
    renderWithProviders(<LedgerPage />)
    expect(
      await screen.findByText(/no entries yet\. add your first expense or refund/i)
    ).toBeInTheDocument()
    const addButtons = screen.getAllByRole('button', { name: /add entry/i })
    expect(addButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('shows table with entries when data is returned', async () => {
    const entries: LedgerEntry[] = [
      {
        id: '1',
        date: '2025-01-15',
        description: 'Coffee',
        categoryId: 'c1',
        categoryName: 'Food',
        paymentMethodId: 'p1',
        paymentMethodName: 'Card',
        currency: 'INR',
        amount: -100,
        tags: ['work'],
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z',
      },
    ]
    mockApi.GET.mockImplementation((path: string) => {
      if (path === '/api/v1/ledger-entries') {
        return Promise.resolve({
          data: { data: entries, nextCursor: null },
          error: undefined,
          response: {} as Response,
        } as never)
      }
      return defaultGetMock(path)
    })
    renderWithProviders(<LedgerPage />)
    await waitFor(() => {
      expect(screen.getByText('Coffee')).toBeInTheDocument()
    })
    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getByText('Card')).toBeInTheDocument()
    expect(screen.getByText('work')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('shows Load more when nextCursor is present', async () => {
    mockApi.GET.mockImplementation((path: string) => {
      if (path === '/api/v1/ledger-entries') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: '1',
                date: '2025-01-15',
                description: 'Item',
                categoryId: 'c1',
                categoryName: 'Food',
                paymentMethodId: 'p1',
                paymentMethodName: 'Card',
                currency: 'INR',
                amount: -50,
                tags: [],
                createdAt: '',
                updatedAt: '',
              },
            ],
            nextCursor: 'cursor-2',
          },
          error: undefined,
          response: {} as Response,
        } as never)
      }
      return defaultGetMock(path)
    })
    renderWithProviders(<LedgerPage />)
    await waitFor(() => {
      expect(screen.getByText('Item')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
  })

  it('opens add entry modal when Add entry is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LedgerPage />)
    await waitFor(() => {
      expect(screen.getByText(/no entries yet/i)).toBeInTheDocument()
    })
    const addButtons = screen.getAllByRole('button', { name: /add entry/i })
    await user.click(addButtons[0]!)
    expect(screen.getByRole('dialog', { name: /add entry/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/what was this for/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create entry/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })
})
