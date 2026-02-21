/** Category as returned by the API (list and single). */
export interface Category {
  id: string
  name: string
  color: string | null
  active: boolean
  createdAt: string
}

/** List response: GET /api/v1/categories */
export interface CategoryListResponse {
  data: Category[]
}
