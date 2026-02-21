import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import {
  CategoriesPage,
  CustomQueryPage,
  DashboardPage,
  HomePage,
  LedgerPage,
  PaymentMethodsPage,
} from '@/pages'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000 * 2, // 2 minutes
    },
  },
})

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="ledger" element={<LedgerPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="payment-methods" element={<PaymentMethodsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="custom-query" element={<CustomQueryPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
