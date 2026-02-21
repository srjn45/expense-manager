import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/ledger', label: 'Ledger' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/payment-methods', label: 'Payment methods' },
  { to: '/categories', label: 'Categories' },
  { to: '/custom-query', label: 'Custom query' },
] as const

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <span className="font-semibold">Expense Manager</span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900 border-l-2 border-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-3 text-xs text-gray-500">v0.1</div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
