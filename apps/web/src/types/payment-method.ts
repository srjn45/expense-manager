/** Payment method as returned by the API (list and single). */
export interface PaymentMethod {
  id: string
  name: string
  currency: string
  active: boolean
  createdAt: string
}

/** List response: GET /api/v1/payment-methods */
export interface PaymentMethodListResponse {
  data: PaymentMethod[]
}
