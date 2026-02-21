import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoriesPage } from './CategoriesPage'
import { renderWithProviders } from '@/test/utils'
import { api } from '@/api/client'
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

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  it('shows page title and subtitle', () => {
    mockApi.GET.mockResolvedValue({ data: { data: [] } } as never)
    renderWithProviders(<CategoriesPage />)
    expect(screen.getByRole('heading', { name: /^categories$/i })).toBeInTheDocument()
    expect(
      screen.getByText(/expense categories like food, transport, bills.*optional color/i)
    ).toBeInTheDocument()
  })

  it('shows empty state and Add category button when list is empty', async () => {
    mockApi.GET.mockResolvedValue({ data: { data: [] } } as never)
    renderWithProviders(<CategoriesPage />)
    expect(
      await screen.findByText(/no categories yet\. Add one to categorize expenses/i)
    ).toBeInTheDocument()
    const addButtons = screen.getAllByRole('button', { name: /add category/i })
    expect(addButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('shows table with categories when data is returned', async () => {
    const items: Category[] = [
      {
        id: '1',
        name: 'Food',
        color: '#4F46E5',
        active: true,
        createdAt: '2025-01-01T00:00:00Z',
      },
    ]
    mockApi.GET.mockResolvedValue({ data: { data: items } } as never)
    renderWithProviders(<CategoriesPage />)
    await waitFor(() => {
      expect(screen.getByText('Food')).toBeInTheDocument()
    })
    expect(screen.getByText('#4F46E5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('shows — for category with no color', async () => {
    const items: Category[] = [
      {
        id: '1',
        name: 'Transport',
        color: null,
        active: true,
        createdAt: '2025-01-01T00:00:00Z',
      },
    ]
    mockApi.GET.mockResolvedValue({ data: { data: items } } as never)
    renderWithProviders(<CategoriesPage />)
    await waitFor(() => {
      expect(screen.getByText('Transport')).toBeInTheDocument()
    })
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('opens add modal when Add category is clicked', async () => {
    const user = userEvent.setup()
    mockApi.GET.mockResolvedValue({ data: { data: [] } } as never)
    renderWithProviders(<CategoriesPage />)
    await waitFor(() => {
      expect(mockApi.GET).toHaveBeenCalledWith('/api/v1/categories')
    })
    const addButtons = screen.getAllByRole('button', { name: /add category/i })
    await user.click(addButtons[0]!)
    expect(screen.getByRole('dialog', { name: /add category/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e\.g\. food, transport/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/color \(optional\)/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })
})
