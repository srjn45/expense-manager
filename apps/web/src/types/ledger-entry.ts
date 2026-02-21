/** Ledger entry as returned by the API (list and single). */
export interface LedgerEntry {
  id: string
  date: string
  description: string
  categoryId: string
  categoryName: string
  paymentMethodId: string
  paymentMethodName: string
  currency: string
  amount: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

/** List response: GET /api/v1/ledger-entries */
export interface LedgerEntryListResponse {
  data: LedgerEntry[]
  nextCursor: string | null
}
